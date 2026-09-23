import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { generateSlug } from '../utils/slug';
import { CreateCategoryInput, UpdateCategoryInput } from '../validation/category.validation';

interface ListCategoriesParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export async function listCategories(params: ListCategoriesParams) {
  const { page, limit, skip, take, search, status } = params;

  const where: Prisma.CategoryWhereInput = {
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.category.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.category.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getCategoryById(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new AppError(404, 'NOT_FOUND', 'Category not found');
  return category;
}

export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
  return prisma.category.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      badge: input.badge ?? null,
      status: input.status,
    },
  });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  await getCategoryById(id);
  const data: Prisma.CategoryUpdateInput = { ...input };
  if (input.slug) data.slug = generateSlug(input.slug);
  else if (input.name) data.slug = undefined;
  return prisma.category.update({ where: { id }, data });
}

export async function softDeleteCategory(id: string) {
  await getCategoryById(id);
  return prisma.category.update({ where: { id }, data: { status: 'INACTIVE' } });
}
