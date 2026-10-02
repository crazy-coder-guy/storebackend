import { Coupon, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { CreateCouponInput, UpdateCouponInput } from '../validation/coupon.validation';

type PrismaOrTx = PrismaClient | Prisma.TransactionClient;

interface ListCouponsParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function listCoupons(params: ListCouponsParams) {
  const { page, limit, skip, take, search, status } = params;
  const where: Prisma.CouponWhereInput = {
    ...(search?.trim() ? { code: { contains: search.trim(), mode: 'insensitive' } } : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.coupon.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.coupon.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getCouponById(id: string) {
  const coupon = await prisma.coupon.findUnique({ where: { id } });
  if (!coupon) throw new AppError(404, 'NOT_FOUND', 'Coupon not found');
  return coupon;
}

export async function createCoupon(input: CreateCouponInput) {
  const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
  if (existing) throw new AppError(409, 'DUPLICATE_CODE', `Coupon code "${input.code}" already exists`);

  return prisma.coupon.create({
    data: {
      code: input.code,
      type: input.type,
      value: input.value,
      minOrderValue: input.minOrderValue,
      maxDiscountAmount: input.maxDiscountAmount,
      usageLimit: input.usageLimit,
      perUserLimit: input.perUserLimit ?? 1,
      expiresAt: input.expiresAt,
      status: input.status ?? 'ACTIVE',
    },
  });
}

export async function updateCoupon(id: string, input: UpdateCouponInput) {
  await getCouponById(id);
  if (input.code) {
    const existing = await prisma.coupon.findUnique({ where: { code: input.code } });
    if (existing && existing.id !== id) {
      throw new AppError(409, 'DUPLICATE_CODE', `Coupon code "${input.code}" already exists`);
    }
  }
  return prisma.coupon.update({ where: { id }, data: input });
}

export async function deleteCoupon(id: string) {
  const coupon = await getCouponById(id);
  if (coupon.usedCount > 0) {
    throw new AppError(
      422,
      'COUPON_IN_USE',
      'This coupon has already been redeemed by customers — deactivate it instead of deleting it.'
    );
  }
  await prisma.coupon.delete({ where: { id } });
  return { id };
}

// Pure discount math shared between the cart-preview endpoint and order
// creation — kept as one function so the amount a customer sees on the cart
// is exactly what gets charged at checkout.
export function computeDiscount(coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscountAmount'>, subtotal: number) {
  if (subtotal <= 0) return 0;
  let discount =
    coupon.type === 'PERCENTAGE' ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  if (coupon.maxDiscountAmount != null) {
    discount = Math.min(discount, Number(coupon.maxDiscountAmount));
  }
  return Math.min(discount, subtotal);
}

// Checks every rule (status/expiry/min-order/usage limits) for a coupon that
// has already been looked up, against a specific user + cart subtotal —
// re-run from scratch each time rather than trusting a previous check, since
// expiry/limits can change between when a user applies a code and when they
// finally check out.
export async function assertCouponUsable(
  client: PrismaOrTx,
  coupon: Coupon,
  userId: string,
  subtotal: number
): Promise<number> {
  if (coupon.status !== 'ACTIVE') {
    throw new AppError(422, 'COUPON_INACTIVE', 'This coupon is no longer active');
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    throw new AppError(422, 'COUPON_EXPIRED', 'This coupon has expired');
  }
  if (coupon.minOrderValue != null && subtotal < Number(coupon.minOrderValue)) {
    throw new AppError(
      422,
      'COUPON_MIN_ORDER',
      `This coupon needs a minimum order of ₹${Number(coupon.minOrderValue).toFixed(0)}`
    );
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError(422, 'COUPON_USAGE_LIMIT_REACHED', 'This coupon has already reached its usage limit');
  }

  const redemptionCount = await client.couponRedemption.count({ where: { couponId: coupon.id, userId } });
  if (redemptionCount >= coupon.perUserLimit) {
    throw new AppError(422, 'COUPON_ALREADY_USED', "You've already used this coupon");
  }

  return computeDiscount(coupon, subtotal);
}

// Looks a code up and validates it in one call — the entry point for the
// cart apply-coupon endpoint and for order creation (which re-validates the
// code stored on the cart at the moment of checkout).
export async function validateCouponForUser(
  client: PrismaOrTx,
  code: string,
  userId: string,
  subtotal: number
): Promise<{ coupon: Coupon; discountAmount: number }> {
  const coupon = await client.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon) throw new AppError(404, 'COUPON_NOT_FOUND', "That coupon code doesn't exist");
  const discountAmount = await assertCouponUsable(client, coupon, userId, subtotal);
  return { coupon, discountAmount };
}

export async function applyCouponToCart(userId: string, code: string, subtotal: number) {
  const { coupon } = await validateCouponForUser(prisma, code, userId, subtotal);
  await prisma.cart.update({ where: { userId }, data: { couponId: coupon.id } });
  return coupon;
}

export async function removeCouponFromCart(userId: string) {
  await prisma.cart.updateMany({ where: { userId }, data: { couponId: null } });
}

// Re-checks a coupon already sitting on a cart (e.g. the cart is just being
// viewed, not checked out) — unlike validateCouponForUser, an invalid coupon
// here isn't a hard error, it just means the cart should stop showing it.
export async function revalidateCartCoupon(
  userId: string,
  couponId: string,
  subtotal: number
): Promise<{ coupon: Coupon; discountAmount: number } | null> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return null;
  try {
    const discountAmount = await assertCouponUsable(prisma, coupon, userId, subtotal);
    return { coupon, discountAmount };
  } catch {
    return null;
  }
}

// Records that `userId` has now used `couponId` via `orderId`, and bumps the
// running usage count — must run inside the same transaction as order
// creation so a race between two checkouts can't both slip past usageLimit.
export async function redeemCoupon(tx: Prisma.TransactionClient, couponId: string, userId: string, orderId: string) {
  await tx.couponRedemption.create({ data: { couponId, userId, orderId } });
  await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
}
