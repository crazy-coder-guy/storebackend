import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { CreateSizeInput, UpdateSizeInput } from '../validation/size.validation';

interface ListSizesParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function listSizes(params: ListSizesParams) {
  const { page, limit, skip, take, status } = params;
  const where: Prisma.SizeWhereInput = { ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    prisma.size.findMany({ where, skip, take, orderBy: { sortOrder: 'asc' } }),
    prisma.size.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getSizeById(id: string) {
  const size = await prisma.size.findUnique({ where: { id } });
  if (!size) throw new AppError(404, 'NOT_FOUND', 'Size not found');
  return size;
}

export async function createSize(input: CreateSizeInput) {
  return prisma.size.create({
    data: {
      name: input.name,
      code: input.code,
      sortOrder: input.sortOrder ?? 0,
      status: input.status,
    },
  });
}

export async function updateSize(id: string, input: UpdateSizeInput) {
  await getSizeById(id);
  return prisma.size.update({ where: { id }, data: input });
}

export async function softDeleteSize(id: string) {
  await getSizeById(id);
  return prisma.size.update({ where: { id }, data: { status: 'INACTIVE' } });
}
