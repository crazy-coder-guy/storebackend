import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { prismaDirect } from '../database/prismaDirect';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { CreateOrderInput } from '../validation/order.validation';
import * as orderNotificationService from './orderNotification.service';
import { calculateDeliveryFee, calculateOrderProfit } from '../utils/pricing';
import { getPricingSettings } from './pricing.service';
import * as addressService from './address.service';
import * as couponService from './coupon.service';

interface ListOrdersParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: 'PAID' | 'UNPAID' | 'REFUNDED';
}

const orderInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            },
          },
          color: true,
          size: true,
        },
      },
    },
  },
  coupon: { select: { code: true } },
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function serializeOrder(order: OrderWithRelations) {
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    // Shipping is the one cost figure customers are meant to see — every
    // other cost/profit field on Order is intentionally left out of this
    // whitelist (product cost, courier, packaging, gateway fee, margin, ...).
    shippingFee: order.shippingFee,
    couponCode: order.coupon?.code ?? null,
    itemsCount,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.variant.productId,
      productSlug: item.variant.product.slug,
      productImageUrl: item.variant.product.images[0]?.imageUrl ?? null,
      productName: item.variant.product.name,
      colorName: item.variant.color?.name ?? null,
      colorHex: item.variant.color?.hexCode ?? null,
      sizeName: item.variant.size.name,
      sizeCode: item.variant.size.code,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    shippingAddress: order.shippingAddress,
    doorNumber: order.doorNumber,
    streetName: order.streetName,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
  };
}

// Admin-only view — adds the full cost/profit breakdown on top of the
// customer-safe fields above. Never used on any customer-facing route.
function serializeOrderForAdmin(order: OrderWithRelations) {
  const netContributionPercent =
    Number(order.totalAmount) > 0 ? (Number(order.netContribution) / Number(order.totalAmount)) * 100 : 0;

  return {
    ...serializeOrder(order),
    items: order.items.map((item) => {
      const unitProfit = Number(item.unitPrice) - Number(item.costPrice);
      return {
        id: item.id,
        productId: item.variant.productId,
        productSlug: item.variant.product.slug,
        productImageUrl: item.variant.product.images[0]?.imageUrl ?? null,
        productName: item.variant.product.name,
        colorName: item.variant.color?.name ?? null,
        colorHex: item.variant.color?.hexCode ?? null,
        sizeName: item.variant.size.name,
        sizeCode: item.variant.size.code,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
        unitProfit,
        profitMarginPercent: Number(item.unitPrice) > 0 ? (unitProfit / Number(item.unitPrice)) * 100 : 0,
      };
    }),
    productCostTotal: order.productCostTotal,
    packagingCost: order.packagingCost,
    courierCost: order.courierCost,
    paymentGatewayFee: order.paymentGatewayFee,
    marketingCost: order.marketingCost,
    exchangeBuffer: order.exchangeBuffer,
    miscCost: order.miscCost,
    netContribution: order.netContribution,
    netContributionPercent,
  };
}

export async function listOrders(params: ListOrdersParams) {
  const { page, limit, skip, take, search, status, paymentStatus } = params;

  const where: Prisma.OrderWhereInput = {
    ...(search?.trim()
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerEmail: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take,
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.order.count({ where }),
  ]);

  return { items: rawItems.map(serializeOrderForAdmin), meta: buildMeta(page, limit, total) };
}

async function getOrderRaw(id: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  return order;
}

export async function getOrderById(id: string) {
  return serializeOrder(await getOrderRaw(id));
}

export async function getOrderByIdForAdmin(id: string) {
  return serializeOrderForAdmin(await getOrderRaw(id));
}

export async function listMyOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(serializeOrder);
}

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, '');
}

// Lets a guest (no sign-in) look up their own order with just its number
// plus the phone or email it was placed under — the two together prove
// ownership well enough for a read-only status check, the same trust level
// as a courier's own "track your shipment" page. Deliberately returns the
// exact same generic error whether the order number doesn't exist or the
// contact just doesn't match it, so this can't be used to enumerate real
// order numbers or confirm someone's phone/email is tied to one.
export async function trackOrder(orderNumber: string, contact: string) {
  const notFoundError = new AppError(
    404,
    'ORDER_NOT_FOUND',
    "We couldn't find an order matching that number and contact detail"
  );

  const order = await prisma.order.findUnique({ where: { orderNumber: orderNumber.trim() } });
  if (!order) throw notFoundError;

  const trimmedContact = contact.trim().toLowerCase();
  const contactDigits = normalizePhoneDigits(contact);
  const emailMatches = trimmedContact.length > 0 && order.customerEmail.toLowerCase() === trimmedContact;
  const phoneMatches =
    contactDigits.length >= 10 && normalizePhoneDigits(order.customerPhone).endsWith(contactDigits.slice(-10));

  if (!emailMatches && !phoneMatches) throw notFoundError;

  return getOrderById(order.id);
}

export async function createOrder(userId: string, authedEmail: string, input: CreateOrderInput) {
  // Read-only and independent of the transaction's own data — fetched once
  // up front rather than inside it.
  const pricingSettings = await getPricingSettings();

  const orderId = await prismaDirect.$transaction(async (tx) => {
    const variantIds = input.items.map((item) => item.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new AppError(422, 'INVALID_VARIANT', 'One or more product variants do not exist');
    }

    let totalAmount = new Prisma.Decimal(0);
    let productCostTotal = new Prisma.Decimal(0);
    const itemsData: {
      variantId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      costPrice: Prisma.Decimal;
    }[] = [];

    for (const line of input.items) {
      const variant = variants.find((v) => v.id === line.variantId)!;
      if (variant.product.status === 'LAUNCHING_SOON') {
        throw new AppError(
          422,
          'LAUNCHING_SOON',
          `"${variant.product.name}" hasn't launched yet — check back soon!`
        );
      }
      if (variant.stockQuantity < line.quantity) {
        throw new AppError(
          422,
          'INSUFFICIENT_STOCK',
          variant.stockQuantity === 0
            ? `Sorry, "${variant.product.name}" just sold out. Please remove it from your cart to continue.`
            : `Sorry, only ${variant.stockQuantity} left of "${variant.product.name}". Please update the quantity in your cart.`
        );
      }
      const unitPrice = new Prisma.Decimal(variant.price ?? variant.product.basePrice);
      // Snapshotted at order time so later cost/price edits don't retroactively
      // change the profit history of an already-placed order.
      const costPrice = new Prisma.Decimal(variant.costPrice ?? variant.product.costPrice ?? 0);
      totalAmount = totalAmount.add(unitPrice.mul(line.quantity));
      productCostTotal = productCostTotal.add(costPrice.mul(line.quantity));
      itemsData.push({ variantId: variant.id, quantity: line.quantity, unitPrice, costPrice });
    }

    const subtotal = totalAmount;
    let discountAmount = new Prisma.Decimal(0);
    let appliedCouponId: string | null = null;
    if (input.couponCode) {
      const { coupon, discountAmount: amount } = await couponService.validateCouponForUser(
        tx,
        input.couponCode,
        userId,
        Number(subtotal)
      );
      discountAmount = new Prisma.Decimal(amount);
      appliedCouponId = coupon.id;
    }

    const shippingFee = calculateDeliveryFee(Number(subtotal), pricingSettings);
    totalAmount = totalAmount.sub(discountAmount).add(shippingFee);

    // Courier/packaging/exchange-buffer/misc/marketing are order-level costs
    // (charged once regardless of item count) — only productCostTotal scales
    // with quantity. See calculateOrderProfit.
    const profit = calculateOrderProfit(Number(totalAmount), Number(productCostTotal), shippingFee, pricingSettings);

    const orderNumber = `#ORD-${1000 + (await tx.order.count()) + 1}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        userId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: authedEmail,
        paymentStatus: input.paymentStatus ?? 'UNPAID',
        totalAmount,
        discountAmount,
        couponId: appliedCouponId,
        shippingAddress: addressService.formatShippingAddress(input),
        doorNumber: input.doorNumber,
        streetName: input.streetName,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        shippingFee,
        productCostTotal,
        packagingCost: profit.packagingCost,
        courierCost: profit.courierCost,
        paymentGatewayFee: profit.paymentGatewayFee,
        marketingCost: profit.marketingCost,
        exchangeBuffer: profit.exchangeBuffer,
        miscCost: profit.miscCost,
        netContribution: profit.netContribution,
        items: { create: itemsData },
      },
    });

    if (appliedCouponId) {
      await couponService.redeemCoupon(tx, appliedCouponId, userId, order.id);
    }

    for (const line of input.items) {
      const variant = variants.find((v) => v.id === line.variantId)!;
      const newStock = variant.stockQuantity - line.quantity;
      await tx.productVariant.update({ where: { id: variant.id }, data: { stockQuantity: newStock } });
      await tx.inventoryTransaction.create({
        data: {
          variantId: variant.id,
          transactionType: 'MANUAL_DECREASE',
          quantity: line.quantity,
          previousStock: variant.stockQuantity,
          newStock,
          reason: `Order ${orderNumber}`,
        },
      });
    }

    return order.id;
  });

  await addressService.saveAddress(userId, {
    name: input.customerName,
    phone: input.customerPhone,
    doorNumber: input.doorNumber,
    streetName: input.streetName,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
  });

  return getOrderById(orderId);
}

// Lets a customer abandon their own order before it's paid — used when the
// Razorpay checkout modal is dismissed or fails to open, so a retried
// checkout doesn't leave a trail of dead PENDING/UNPAID orders behind (and so
// a coupon used on the abandoned attempt is freed up again via the
// CANCELLED-path rollback in updateOrderStatus below).
export async function cancelMyOrder(userId: string, id: string) {
  const order = await getOrderRaw(id);
  if (order.userId !== userId) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  if (order.status !== 'PENDING') {
    throw new AppError(422, 'ORDER_NOT_CANCELLABLE', 'Only a pending, unpaid order can be cancelled this way');
  }
  return updateOrderStatus(id, 'CANCELLED');
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await getOrderRaw(id);
  const statusChanged = order.status !== status;
  const statusData = { status, ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}) };

  if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
    await prismaDirect.$transaction(async (tx) => {
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant) continue;
        const newStock = variant.stockQuantity + item.quantity;
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: newStock } });
        await tx.inventoryTransaction.create({
          data: {
            variantId: item.variantId,
            transactionType: 'RESTOCK',
            quantity: item.quantity,
            previousStock: variant.stockQuantity,
            newStock,
            reason: `Order ${order.orderNumber} cancelled`,
          },
        });
      }
      // A cancelled order shouldn't have permanently burned a one-time-use
      // coupon — release the redemption and the usage count so the customer
      // can actually use it on a real, successful order.
      if (order.couponId) {
        await tx.couponRedemption.deleteMany({ where: { orderId: id } });
        await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { decrement: 1 } } });
      }
      await tx.order.update({ where: { id }, data: statusData });
    });
  } else {
    await prisma.order.update({ where: { id }, data: statusData });
  }

  const updated = await getOrderById(id);
  if (statusChanged) {
    // Fire-and-forget: a push failure (e.g. the user never enabled
    // notifications) must never crash the request that changed the order's
    // status — `void` alone doesn't catch a rejection, it just discards the
    // return value, so an uncaught one here takes down the whole process.
    orderNotificationService.notifyOrderStatusChanged(updated).catch((err) => {
      console.error(`[order] notifyOrderStatusChanged failed for ${updated.orderNumber}:`, err);
    });
  }
  return updated;
}
