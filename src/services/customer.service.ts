import { EntityStatus, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { getLatestVisitsByEmail, VisitInfo } from './visit.service';

interface ListCustomersParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
  status?: EntityStatus;
}

const userInclude = {
  orders: {
    select: { totalAmount: true, createdAt: true, customerPhone: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.UserInclude;

type UserWithOrders = Prisma.UserGetPayload<{ include: typeof userInclude }>;

function serializeCustomer(user: UserWithOrders, visitByEmail: Map<string, VisitInfo>) {
  const ordersCount = user.orders.length;
  const totalSpent = user.orders.reduce((sum, order) => sum.add(order.totalAmount), new Prisma.Decimal(0));
  const lastOrder = user.orders[0];

  return {
    id: user.id,
    name: user.name ?? user.email.split('@')[0],
    email: user.email,
    phone: lastOrder?.customerPhone ?? '',
    status: user.status,
    ordersCount,
    totalSpent,
    lastOrderAt: lastOrder?.createdAt ?? user.createdAt,
    createdAt: user.createdAt,
    lastVisit: visitByEmail.get(user.email) ?? null,
  };
}

export async function listCustomers(params: ListCustomersParams) {
  const { page, limit, skip, take, search, status } = params;

  const where: Prisma.UserWhereInput = {
    ...(search?.trim()
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { orders: { some: { customerPhone: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      include: userInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const visitByEmail = await getLatestVisitsByEmail(rawItems.map((u) => u.email));

  return {
    items: rawItems.map((u) => serializeCustomer(u, visitByEmail)),
    meta: buildMeta(page, limit, total),
  };
}

export async function getCustomerById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
  const visitByEmail = await getLatestVisitsByEmail([user.email]);
  return serializeCustomer(user, visitByEmail);
}
