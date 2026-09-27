import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { AddCartItemInput, UpdateCartItemInput } from '../validation/cart.validation';
import { FREE_DELIVERY_THRESHOLD, calculateDeliveryFee } from '../utils/pricing';

const cartItemInclude = {
  variant: {
    include: {
      product: {
        include: {
          category: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        },
      },
      color: true,
      size: true,
    },
  },
} satisfies Prisma.CartItemInclude;

type CartItemWithRelations = Prisma.CartItemGetPayload<{ include: typeof cartItemInclude }>;

function serializeCartItem(item: CartItemWithRelations) {
  const { variant } = item;
  const { product } = variant;
  return {
    id: item.id,
    variantId: variant.id,
    productId: product.id,
    name: product.name,
    subtitle: product.category?.name ?? '',
    price: Number(variant.price ?? product.basePrice),
    mrp: Number(product.mrp),
    image: product.images[0]?.imageUrl ?? null,
    size: variant.size.code || variant.size.name,
    color: { name: variant.color.name, hex: variant.color.hexCode },
    quantity: item.quantity,
    stockQuantity: variant.stockQuantity,
  };
}

// One round-trip instead of findUnique-then-maybe-create — each round-trip
// to the database costs a fixed network RTT (~270ms in this deployment), so
// every call this service saves matters far more than local query cost does.
function getOrCreateCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function getCartItems(cartId: string) {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: cartItemInclude,
    orderBy: { createdAt: 'asc' },
  });
  return items.map(serializeCartItem);
}

function buildCartSummary(items: ReturnType<typeof serializeCartItem>[]) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const mrpTotal = items.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const discount = Math.max(0, mrpTotal - subtotal);
  const deliveryFee = calculateDeliveryFee(subtotal);
  return {
    subtotal,
    mrpTotal,
    discount,
    deliveryFee,
    total: subtotal + deliveryFee,
    freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  };
}

async function getCartWithSummary(cartId: string) {
  const items = await getCartItems(cartId);
  return { items, summary: buildCartSummary(items) };
}

export async function getCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  return getCartWithSummary(cart.id);
}

// A stale UI (or a race with someone else buying the last unit) can still
// ask for more than is left — reject clearly here rather than letting an
// over-quantity line sit in the cart until checkout rejects the whole order.
function assertStockAvailable(productName: string, availableStock: number, desiredQuantity: number) {
  if (desiredQuantity <= availableStock) return;
  if (availableStock === 0) {
    throw new AppError(422, 'INSUFFICIENT_STOCK', `Sorry, "${productName}" just sold out.`);
  }
  throw new AppError(
    422,
    'INSUFFICIENT_STOCK',
    `Sorry, only ${availableStock} left of "${productName}". Please lower the quantity.`
  );
}

export async function addCartItem(userId: string, input: AddCartItemInput) {
  const variant = await prisma.productVariant.findUnique({
    where: { id: input.variantId },
    include: { product: { select: { name: true } } },
  });
  if (!variant) throw new AppError(404, 'NOT_FOUND', 'Product variant not found');
  if (variant.status !== 'ACTIVE') {
    throw new AppError(422, 'VARIANT_INACTIVE', 'This product option is no longer available');
  }

  const cart = await getOrCreateCart(userId);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
  });
  assertStockAvailable(variant.product.name, variant.stockQuantity, (existing?.quantity ?? 0) + input.quantity);

  // upsert replaces the previous find-then-create/update pair with one call.
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
    update: { quantity: { increment: input.quantity } },
    create: { cartId: cart.id, variantId: input.variantId, quantity: input.quantity },
  });

  return getCartWithSummary(cart.id);
}

async function getOwnedCartItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    include: { variant: { include: { product: { select: { name: true } } } } },
  });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');
  return item;
}

export async function updateCartItem(userId: string, itemId: string, input: UpdateCartItemInput) {
  const cart = await getOrCreateCart(userId);
  const item = await getOwnedCartItem(cart.id, itemId);

  if (input.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    assertStockAvailable(item.variant.product.name, item.variant.stockQuantity, input.quantity);
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } });
  }

  return getCartWithSummary(cart.id);
}

export async function removeCartItem(userId: string, itemId: string) {
  const cart = await getOrCreateCart(userId);
  const item = await getOwnedCartItem(cart.id, itemId);
  await prisma.cartItem.delete({ where: { id: item.id } });
  return getCartWithSummary(cart.id);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return { items: [], summary: buildCartSummary([]) };
}

// Admin-facing: every user currently sitting on a non-empty cart — the
// "who might we nudge with a reminder" list. Sorted by genuine last cart
// activity (the latest cart_item write), not Cart.updatedAt, which gets
// bumped on every read via the upsert in getOrCreateCart and so can't be
// trusted to mean "last touched".
export async function listCartsWithItems(params: {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
}) {
  const { page, limit, skip, take, search } = params;

  const carts = await prisma.cart.findMany({
    where: {
      items: { some: {} },
      ...(search?.trim()
        ? {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: cartItemInclude, orderBy: { updatedAt: 'desc' } },
    },
  });

  const rows = carts.map((cart) => {
    const items = cart.items.map(serializeCartItem);
    const summary = buildCartSummary(items);
    const itemsCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return {
      userId: cart.userId,
      customerName: cart.user.name ?? cart.user.email.split('@')[0],
      customerEmail: cart.user.email,
      itemsCount,
      cartTotal: summary.total,
      lastActivityAt: cart.items[0]?.updatedAt ?? cart.updatedAt,
    };
  });

  rows.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

  const total = rows.length;
  const pageItems = rows.slice(skip, skip + take);

  return { items: pageItems, meta: buildMeta(page, limit, total) };
}
