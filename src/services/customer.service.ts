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

const customerInclude = {
  orders: { select: { totalAmount: true, createdAt: true } },
} satisfies Prisma.CustomerInclude;

type CustomerWithOrders = Prisma.CustomerGetPayload<{ include: typeof customerInclude }>;

function serializeCustomer(customer: CustomerWithOrders, visitByEmail: Map<string, VisitInfo>) {
  const ordersCount = customer.orders.length;
  const totalSpent = customer.orders.reduce(
    (sum, order) => sum.add(order.totalAmount),
    new Prisma.Decimal(0)
  );
  const lastOrderAt = customer.orders.reduce<Date | null>((latest, order) => {
    return !latest || order.createdAt > latest ? order.createdAt : latest;
  }, null);

  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    ordersCount,
    totalSpent,
    lastOrderAt: lastOrderAt ?? customer.createdAt,
    createdAt: customer.createdAt,
    lastVisit: visitByEmail.get(customer.email) ?? null,
  };
}

export async function listCustomers(params: ListCustomersParams) {
  const { page, limit, skip, take, search, status } = params;

  const where: Prisma.CustomerWhereInput = {
    ...(search?.trim()
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [rawItems, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      include: customerInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  const visitByEmail = await getLatestVisitsByEmail(rawItems.map((c) => c.email));

  return {
    items: rawItems.map((c) => serializeCustomer(c, visitByEmail)),
    meta: buildMeta(page, limit, total),
  };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id }, include: customerInclude });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
  const visitByEmail = await getLatestVisitsByEmail([customer.email]);
  return serializeCustomer(customer, visitByEmail);
}
