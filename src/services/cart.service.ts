import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
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
    size: variant.size.name,
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

export async function addCartItem(userId: string, input: AddCartItemInput) {
  const variant = await prisma.productVariant.findUnique({ where: { id: input.variantId } });
  if (!variant) throw new AppError(404, 'NOT_FOUND', 'Product variant not found');
  if (variant.status !== 'ACTIVE') {
    throw new AppError(422, 'VARIANT_INACTIVE', 'This product option is no longer available');
  }

  const cart = await getOrCreateCart(userId);

  // upsert replaces the previous find-then-create/update pair with one call.
  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId: input.variantId } },
    update: { quantity: { increment: input.quantity } },
    create: { cartId: cart.id, variantId: input.variantId, quantity: input.quantity },
  });

  return getCartWithSummary(cart.id);
}

async function getOwnedCartItem(cartId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) throw new AppError(404, 'NOT_FOUND', 'Cart item not found');
  return item;
}

export async function updateCartItem(userId: string, itemId: string, input: UpdateCartItemInput) {
  const cart = await getOrCreateCart(userId);
  const item = await getOwnedCartItem(cart.id, itemId);

  if (input.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
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
