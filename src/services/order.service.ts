import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { CreateOrderInput } from '../validation/order.validation';
import * as orderNotificationService from './orderNotification.service';

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
  customer: true,
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
} satisfies Prisma.OrderInclude;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function serializeOrder(order: OrderWithRelations) {
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    customerPhone: order.customer.phone,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    itemsCount,
    items: order.items.map((item) => ({
      id: item.id,
      productImageUrl: item.variant.product.images[0]?.imageUrl ?? null,
      productName: item.variant.product.name,
      colorName: item.variant.color.name,
      colorHex: item.variant.color.hexCode,
      sizeName: item.variant.size.name,
      sizeCode: item.variant.size.code,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
  };
}

export async function listOrders(params: ListOrdersParams) {
  const { page, limit, skip, take, search, status, paymentStatus } = params;

  const where: Prisma.OrderWhereInput = {
    ...(search?.trim()
      ? {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { email: { contains: search, mode: 'insensitive' } } },
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

  return { items: rawItems.map(serializeOrder), meta: buildMeta(page, limit, total) };
}

async function getOrderRaw(id: string): Promise<OrderWithRelations> {
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
  return order;
}

export async function getOrderById(id: string) {
  return serializeOrder(await getOrderRaw(id));
}

/**
 * Orders link to a Customer (matched by email at checkout), not to the
 * Firebase-authenticated User — so "my orders" is resolved by matching the
 * signed-in account's email against Customer.email rather than a direct
 * foreign key.
 */
export async function listMyOrders(email: string) {
  const orders = await prisma.order.findMany({
    where: { customer: { email } },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
  });
  return orders.map(serializeOrder);
}

export async function createOrder(input: CreateOrderInput) {
  const orderId = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: { email: input.customerEmail },
      update: { name: input.customerName, phone: input.customerPhone },
      create: { name: input.customerName, email: input.customerEmail, phone: input.customerPhone },
    });

    const variantIds = input.items.map((item) => item.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });

    if (variants.length !== new Set(variantIds).size) {
      throw new AppError(422, 'INVALID_VARIANT', 'One or more product variants do not exist');
    }

    let totalAmount = new Prisma.Decimal(0);
    const itemsData: { variantId: string; quantity: number; unitPrice: Prisma.Decimal }[] = [];

    for (const line of input.items) {
      const variant = variants.find((v) => v.id === line.variantId)!;
      if (variant.stockQuantity < line.quantity) {
        throw new AppError(
          422,
          'INSUFFICIENT_STOCK',
          `Not enough stock for SKU ${variant.sku}: only ${variant.stockQuantity} available`
        );
      }
      const unitPrice = new Prisma.Decimal(variant.price ?? variant.product.basePrice);
      totalAmount = totalAmount.add(unitPrice.mul(line.quantity));
      itemsData.push({ variantId: variant.id, quantity: line.quantity, unitPrice });
    }

    const orderNumber = `#ORD-${1000 + (await tx.order.count()) + 1}`;

    const order = await tx.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        paymentStatus: input.paymentStatus ?? 'UNPAID',
        totalAmount,
        shippingAddress: input.shippingAddress,
        items: { create: itemsData },
      },
    });

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

  return getOrderById(orderId);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await getOrderRaw(id);
  const statusChanged = order.status !== status;

  if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
    await prisma.$transaction(async (tx) => {
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
      await tx.order.update({ where: { id }, data: { status } });
    });
  } else {
    await prisma.order.update({ where: { id }, data: { status } });
  }

  const updated = await getOrderById(id);
  if (statusChanged) {
    void orderNotificationService.notifyOrderStatusChanged(updated);
  }
  return updated;
}
