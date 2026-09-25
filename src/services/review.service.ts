import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { uploadObject } from '../utils/s3';
import { CreateReviewInput } from '../validation/review.validation';

const reviewInclude = {
  user: { select: { name: true, email: true, photoUrl: true } },
} as const;

function serializeReview(review: {
  id: string;
  rating: number;
  comment: string;
  images: string[];
  video: string | null;
  createdAt: Date;
  user: { name: string | null; email: string; photoUrl: string | null };
}) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    images: review.images,
    video: review.video,
    createdAt: review.createdAt,
    reviewerName: review.user.name ?? review.user.email.split('@')[0],
    reviewerPhoto: review.user.photoUrl,
    verifiedPurchase: true,
  };
}

async function getRatingSummary(productId: string) {
  const rows = await prisma.review.groupBy({
    by: ['rating'],
    where: { productId },
    _count: { rating: true },
  });

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;
  for (const row of rows) {
    const rating = row.rating as 1 | 2 | 3 | 4 | 5;
    breakdown[rating] = row._count.rating;
    total += row._count.rating;
    sum += rating * row._count.rating;
  }

  return {
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    count: total,
    breakdown,
  };
}

export async function listProductReviews(
  productId: string,
  params: { page: number; limit: number; skip: number; take: number; rating?: number }
) {
  const where = { productId, ...(params.rating ? { rating: params.rating } : {}) };

  const [rawItems, total, summary] = await Promise.all([
    prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.review.count({ where }),
    getRatingSummary(productId),
  ]);

  return {
    items: rawItems.map(serializeReview),
    meta: buildMeta(params.page, params.limit, total),
    summary,
  };
}

export async function listReviewableOrders(userId: string) {
  const orders = await prisma.order.findMany({
    where: { status: 'DELIVERED', userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const reviewedProductIds = new Set(
    (await prisma.review.findMany({ where: { userId }, select: { productId: true } })).map((r) => r.productId)
  );

  const seenProductIds = new Set<string>();
  const reviewable: {
    orderId: string;
    orderNumber: string;
    productId: string;
    productName: string;
    productImage: string | null;
  }[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      const product = item.variant.product;
      if (reviewedProductIds.has(product.id) || seenProductIds.has(product.id)) continue;
      seenProductIds.add(product.id);
      reviewable.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        productId: product.id,
        productName: product.name,
        productImage: product.images[0]?.imageUrl ?? null,
      });
    }
  }

  return reviewable;
}

async function assertEligibleOrder(userId: string, orderId: string, productId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, status: 'DELIVERED', userId },
    include: { items: { include: { variant: true } } },
  });
  if (!order) {
    throw new AppError(422, 'NOT_ELIGIBLE', 'This order is not eligible for a review on this product');
  }
  const hasProduct = order.items.some((item) => item.variant.productId === productId);
  if (!hasProduct) {
    throw new AppError(422, 'NOT_ELIGIBLE', 'This order does not contain this product');
  }

  const existing = await prisma.review.findUnique({ where: { userId_productId: { userId, productId } } });
  if (existing) {
    throw new AppError(409, 'ALREADY_REVIEWED', 'You have already reviewed this product');
  }
}

export async function createReview(
  userId: string,
  productId: string,
  input: CreateReviewInput,
  files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] }
) {
  await assertEligibleOrder(userId, input.orderId, productId);

  const images = await Promise.all(
    (files.images ?? []).map(async (file) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const key = `reviews/${productId}/${randomUUID()}${ext}`;
      return uploadObject(key, file.buffer, file.mimetype);
    })
  );

  const videoFile = files.video?.[0];
  const video = videoFile
    ? await uploadObject(
        `reviews/${productId}/${randomUUID()}${path.extname(videoFile.originalname).toLowerCase() || '.mp4'}`,
        videoFile.buffer,
        videoFile.mimetype
      )
    : null;

  const review = await prisma.review.create({
    data: {
      productId,
      userId,
      orderId: input.orderId,
      rating: input.rating,
      comment: input.comment,
      images,
      video,
    },
    include: reviewInclude,
  });

  return serializeReview(review);
}

export async function deleteOwnReview(userId: string, productId: string, reviewId: string) {
  const review = await prisma.review.findFirst({ where: { id: reviewId, productId, userId } });
  if (!review) throw new AppError(404, 'NOT_FOUND', 'Review not found');
  await prisma.review.delete({ where: { id: reviewId } });
}

export async function listAllReviews(params: { page: number; limit: number; skip: number; take: number }) {
  const [rawItems, total] = await Promise.all([
    prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true, photoUrl: true } },
        product: { select: { id: true, name: true, slug: true } },
        order: {
          include: {
            items: {
              include: {
                variant: {
                  include: {
                    color: true,
                    size: true,
                    product: {
                      include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: params.skip,
      take: params.take,
    }),
    prisma.review.count(),
  ]);

  const items = rawItems.map((review) => ({
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    images: review.images,
    video: review.video,
    createdAt: review.createdAt,
    reviewerName: review.user.name ?? review.user.email.split('@')[0],
    reviewerEmail: review.user.email,
    reviewerPhoto: review.user.photoUrl,
    productId: review.product.id,
    productName: review.product.name,
    productSlug: review.product.slug,
    order: {
      id: review.order.id,
      orderNumber: review.order.orderNumber,
      status: review.order.status,
      paymentStatus: review.order.paymentStatus,
      totalAmount: review.order.totalAmount,
      shippingAddress: review.order.shippingAddress,
      createdAt: review.order.createdAt,
      customerName: review.order.customerName,
      customerEmail: review.order.customerEmail,
      customerPhone: review.order.customerPhone,
      items: review.order.items.map((item) => ({
        id: item.id,
        productId: item.variant.productId,
        productName: item.variant.product.name,
        productImageUrl: item.variant.product.images[0]?.imageUrl ?? null,
        colorName: item.variant.color.name,
        colorHex: item.variant.color.hexCode,
        sizeCode: item.variant.size.code,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    },
  }));

  return { items, meta: buildMeta(params.page, params.limit, total) };
}

export async function adminDeleteReview(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new AppError(404, 'NOT_FOUND', 'Review not found');
  await prisma.review.delete({ where: { id: reviewId } });
}
