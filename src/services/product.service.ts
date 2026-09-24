import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { generateSlug } from '../utils/slug';
import { CreateProductInput, UpdateProductInput } from '../validation/product.validation';

const SORTABLE_FIELDS = new Set(['created_at', 'base_price', 'name']);
const FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  base_price: 'basePrice',
  name: 'name',
};

interface ListProductsParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  search?: string;
  categoryId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function buildSearchFilter(search: string): Prisma.ProductWhereInput {
  const term = search.trim();
  const priceValue = term !== '' && !Number.isNaN(Number(term)) ? Number(term) : undefined;

  return {
    OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { productType: { contains: term, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: term, mode: 'insensitive' } } } },
      ...(priceValue !== undefined ? [{ basePrice: priceValue }, { mrp: priceValue }] : []),
    ],
  };
}

export async function listProducts(params: ListProductsParams) {
  const { page, limit, skip, take, search, categoryId, status, sortBy, sortOrder } = params;

  const where: Prisma.ProductWhereInput = {
    ...(search?.trim() ? buildSearchFilter(search) : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
  };

  const sortField = sortBy && SORTABLE_FIELDS.has(sortBy) ? FIELD_MAP[sortBy] : 'createdAt';
  const orderBy = { [sortField]: sortOrder === 'asc' ? 'asc' : 'desc' } as Prisma.ProductOrderByWithRelationInput;

  const [rawItems, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        category: true,
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: {
          where: { status: 'ACTIVE' },
          select: { size: true, color: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rawItems.map(({ variants, ...product }) => {
    const sizeMap = new Map<string, (typeof variants)[number]['size']>();
    const colorMap = new Map<string, (typeof variants)[number]['color']>();
    for (const variant of variants) {
      if (variant.size) sizeMap.set(variant.size.id, variant.size);
      if (variant.color) colorMap.set(variant.color.id, variant.color);
    }
    const sizes = [...sizeMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    const colors = [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { ...product, sizes, colors };
  });

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' } },
      variants: {
        include: { color: true, size: true },
      },
    },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  return product;
}

async function assertCategoryExists(categoryId: string) {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(422, 'INVALID_CATEGORY', 'categoryId does not reference an existing category');
}

export async function createProduct(input: CreateProductInput) {
  await assertCategoryExists(input.categoryId);
  const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);

  return prisma.product.create({
    data: {
      name: input.name,
      slug,
      description: input.description ?? null,
      categoryId: input.categoryId,
      productType: input.productType,
      basePrice: input.basePrice,
      mrp: input.mrp,
      badge: input.badge ?? null,
      status: input.status,
      gsm: input.gsm ?? null,
      fabric: input.fabric ?? null,
      fit: input.fit ?? null,
      neckType: input.neckType ?? null,
      biowash: input.biowash ?? false,
    },
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await getProductById(id);
  if (input.categoryId) await assertCategoryExists(input.categoryId);

  const data: Prisma.ProductUncheckedUpdateInput = { ...input };
  if (input.slug) data.slug = generateSlug(input.slug);

  return prisma.product.update({ where: { id }, data });
}

export async function softDeleteProduct(id: string) {
  await getProductById(id);
  return prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
}

export async function deleteProductPermanently(id: string) {
  const product = await getProductById(id);
  if (product.status !== 'INACTIVE') {
    throw new AppError(
      422,
      'PRODUCT_NOT_INACTIVE',
      'Deactivate the product before deleting it permanently'
    );
  }
  await prisma.product.delete({ where: { id } });
}
