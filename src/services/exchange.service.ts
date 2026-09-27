import path from 'path';
import { randomUUID } from 'crypto';
import { ExchangeStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { uploadObject } from '../utils/s3';
import { CreateExchangeRequestInput } from '../validation/exchange.validation';

const ACTIVE_STATUSES: ExchangeStatus[] = ['PENDING', 'APPROVED', 'COMPLETED'];
const EXCHANGE_WINDOW_DAYS = 3;
const EXCHANGE_WINDOW_MS = EXCHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Orders delivered before this feature shipped have no deliveredAt yet —
// fall back to updatedAt (the last time the order record changed, which for
// a delivered order is effectively the delivery timestamp).
function isWithinExchangeWindow(order: { deliveredAt: Date | null; updatedAt: Date }) {
  const deliveredAt = order.deliveredAt ?? order.updatedAt;
  return Date.now() - deliveredAt.getTime() <= EXCHANGE_WINDOW_MS;
}

const itemProductInclude = {
  variant: {
    include: {
      color: true,
      size: true,
      product: {
        include: { images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 } },
      },
    },
  },
} satisfies Prisma.OrderItemInclude;

function serializeItemForEligibility(item: {
  id: string;
  orderId: string;
  order: { orderNumber: string };
  variant: {
    color: { name: string; hexCode: string };
    size: { code: string };
    product: { id: string; name: string; images: { imageUrl: string }[] };
  };
}) {
  return {
    orderItemId: item.id,
    orderId: item.orderId,
    orderNumber: item.order.orderNumber,
    productId: item.variant.product.id,
    productName: item.variant.product.name,
    productImage: item.variant.product.images[0]?.imageUrl ?? null,
    colorName: item.variant.color.name,
    colorHex: item.variant.color.hexCode,
    sizeCode: item.variant.size.code,
  };
}

export async function listEligibleItems(userId: string) {
  const orders = await prisma.order.findMany({
    where: { status: 'DELIVERED', userId },
    include: { items: { include: itemProductInclude } },
    orderBy: { createdAt: 'desc' },
  });

  const requestedItemIds = new Set(
    (
      await prisma.exchangeRequest.findMany({
        where: { userId, status: { in: ACTIVE_STATUSES } },
        select: { orderItemId: true },
      })
    ).map((r) => r.orderItemId)
  );

  return orders
    .filter(isWithinExchangeWindow)
    .flatMap((order) =>
      order.items
        .filter((item) => !requestedItemIds.has(item.id))
        .map((item) => serializeItemForEligibility({ ...item, order: { orderNumber: order.orderNumber } }))
    );
}

const requestInclude = {
  orderItem: { include: itemProductInclude },
  order: { select: { orderNumber: true } },
} satisfies Prisma.ExchangeRequestInclude;

function serializeRequest(request: {
  id: string;
  orderId: string;
  reason: string;
  description: string;
  images: string[];
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: { orderNumber: string };
  orderItem: {
    id: string;
    variant: {
      color: { name: string; hexCode: string };
      size: { code: string };
      product: { id: string; name: string; images: { imageUrl: string }[] };
    };
  };
}) {
  return {
    id: request.id,
    orderId: request.orderId,
    orderNumber: request.order.orderNumber,
    orderItemId: request.orderItem.id,
    productId: request.orderItem.variant.product.id,
    productName: request.orderItem.variant.product.name,
    productImage: request.orderItem.variant.product.images[0]?.imageUrl ?? null,
    colorName: request.orderItem.variant.color.name,
    colorHex: request.orderItem.variant.color.hexCode,
    sizeCode: request.orderItem.variant.size.code,
    reason: request.reason,
    description: request.description,
    images: request.images,
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export async function listMyExchangeRequests(userId: string) {
  const requests = await prisma.exchangeRequest.findMany({
    where: { userId },
    include: requestInclude,
    orderBy: { createdAt: 'desc' },
  });
  return requests.map(serializeRequest);
}

async function assertEligibleItem(userId: string, orderItemId: string) {
  const item = await prisma.orderItem.findFirst({
    where: { id: orderItemId, order: { userId, status: 'DELIVERED' } },
    include: { order: true },
  });
  if (!item) {
    throw new AppError(422, 'NOT_ELIGIBLE', 'This item is not eligible for an exchange request');
  }
  if (!isWithinExchangeWindow(item.order)) {
    throw new AppError(
      422,
      'EXCHANGE_WINDOW_EXPIRED',
      `The ${EXCHANGE_WINDOW_DAYS}-day exchange window for this item has expired`
    );
  }

  const existing = await prisma.exchangeRequest.findFirst({
    where: { orderItemId, status: { in: ACTIVE_STATUSES } },
  });
  if (existing) {
    throw new AppError(409, 'ALREADY_REQUESTED', 'An exchange request already exists for this item');
  }

  return item;
}

export async function createExchangeRequest(
  userId: string,
  input: CreateExchangeRequestInput,
  files: { images?: Express.Multer.File[] }
) {
  const item = await assertEligibleItem(userId, input.orderItemId);

  const images = await Promise.all(
    (files.images ?? []).map(async (file) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const key = `exchanges/${item.orderId}/${randomUUID()}${ext}`;
      return uploadObject(key, file.buffer, file.mimetype);
    })
  );

  const request = await prisma.exchangeRequest.create({
    data: {
      orderId: item.orderId,
      orderItemId: item.id,
      userId,
      reason: input.reason,
      description: input.description,
      images,
    },
    include: requestInclude,
  });

  return serializeRequest(request);
}

export async function cancelOwnExchangeRequest(userId: string, id: string) {
  const request = await prisma.exchangeRequest.findFirst({ where: { id, userId } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Exchange request not found');
  if (request.status !== 'PENDING') {
    throw new AppError(422, 'NOT_CANCELLABLE', 'Only a pending request can be cancelled');
  }
  await prisma.exchangeRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
}

export async function listAllExchangeRequests(params: {
  page: number;
  limit: number;
  skip: number;
  take: number;
  status?: ExchangeStatus;
  search?: string;
}) {
  const { page, limit, skip, take, status, search } = params;

  const where = {
    ...(status ? { status } : {}),
    ...(search?.trim()
      ? {
          order: {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' as const } },
              { customerName: { contains: search, mode: 'insensitive' as const } },
              { customerEmail: { contains: search, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.exchangeRequest.findMany({
      where,
      include: {
        ...requestInclude,
        order: { select: { orderNumber: true, customerName: true, customerEmail: true, customerPhone: true, shippingAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.exchangeRequest.count({ where }),
  ]);

  const items = rawItems.map((request) => ({
    ...serializeRequest(request),
    customerName: request.order.customerName,
    customerEmail: request.order.customerEmail,
    customerPhone: request.order.customerPhone,
    shippingAddress: request.order.shippingAddress,
  }));

  return { items, meta: buildMeta(page, limit, total) };
}

const TRANSITIONS: Record<ExchangeStatus, ExchangeStatus[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED', 'REJECTED'],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateExchangeStatus(id: string, status: ExchangeStatus, adminNote?: string) {
  const request = await prisma.exchangeRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(404, 'NOT_FOUND', 'Exchange request not found');

  if (!TRANSITIONS[request.status].includes(status)) {
    throw new AppError(422, 'INVALID_TRANSITION', `Cannot move a ${request.status} request to ${status}`);
  }

  const updated = await prisma.exchangeRequest.update({
    where: { id },
    data: { status, ...(adminNote !== undefined ? { adminNote } : {}) },
    include: {
      ...requestInclude,
      order: { select: { orderNumber: true, customerName: true, customerEmail: true, customerPhone: true, shippingAddress: true } },
    },
  });

  return {
    ...serializeRequest(updated),
    customerName: updated.order.customerName,
    customerEmail: updated.order.customerEmail,
    customerPhone: updated.order.customerPhone,
    shippingAddress: updated.order.shippingAddress,
  };
}
