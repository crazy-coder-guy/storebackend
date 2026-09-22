import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { CreateColorInput, UpdateColorInput } from '../validation/color.validation';

interface ListColorsParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function listColors(params: ListColorsParams) {
  const { page, limit, skip, take, status } = params;
  const where: Prisma.ColorWhereInput = { ...(status ? { status } : {}) };

  const [items, total] = await Promise.all([
    prisma.color.findMany({ where, skip, take, orderBy: { createdAt: 'asc' } }),
    prisma.color.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getColorById(id: string) {
  const color = await prisma.color.findUnique({ where: { id } });
  if (!color) throw new AppError(404, 'NOT_FOUND', 'Color not found');
  return color;
}

export async function createColor(input: CreateColorInput) {
  return prisma.color.create({
    data: {
      name: input.name,
      code: input.code,
      hexCode: input.hexCode,
      status: input.status,
    },
  });
}

export async function updateColor(id: string, input: UpdateColorInput) {
  await getColorById(id);
  return prisma.color.update({ where: { id }, data: input });
}

export async function softDeleteColor(id: string) {
  await getColorById(id);
  return prisma.color.update({ where: { id }, data: { status: 'INACTIVE' } });
}
