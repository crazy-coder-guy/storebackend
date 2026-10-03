import { Prisma, ProductFit, NeckType, ProductStatus } from '@prisma/client';
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
  categoryIds?: string[];
  status?: ProductStatus | ProductStatus[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ids?: string[];
  colorIds?: string[];
  sizeIds?: string[];
  fits?: string[];
  neckTypes?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
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
  const {
    page,
    limit,
    skip,
    take,
    search,
    categoryId,
    categoryIds,
    status,
    sortBy,
    sortOrder,
    ids,
    colorIds,
    sizeIds,
    fits,
    neckTypes,
    minPrice,
    maxPrice,
    inStock,
  } = params;

  const priceFilter: Prisma.ProductWhereInput =
    minPrice !== undefined || maxPrice !== undefined
      ? {
          basePrice: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {};

  // Color/size/stock only make sense as "does this product have a matching
  // variant", so they fold into one variants.some(...) filter instead of
  // separate top-level clauses.
  const needsVariantFilter = Boolean(
    (colorIds && colorIds.length > 0) || (sizeIds && sizeIds.length > 0) || inStock
  );
  const variantFilter: Prisma.ProductVariantWhereInput = {
    status: 'ACTIVE',
    ...(colorIds && colorIds.length > 0 ? { colorId: { in: colorIds } } : {}),
    ...(sizeIds && sizeIds.length > 0 ? { sizeId: { in: sizeIds } } : {}),
    ...(inStock ? { stockQuantity: { gt: 0 } } : {}),
  };

  const where: Prisma.ProductWhereInput = {
    ...(search?.trim() ? buildSearchFilter(search) : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(categoryIds && categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
    ...(status ? { status: Array.isArray(status) ? { in: status } : status } : {}),
    ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    ...(fits && fits.length > 0 ? { fit: { in: fits as ProductFit[] } } : {}),
    ...(neckTypes && neckTypes.length > 0 ? { neckType: { in: neckTypes as NeckType[] } } : {}),
    ...priceFilter,
    ...(needsVariantFilter ? { variants: { some: variantFilter } } : {}),
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
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], include: { color: true } },
        variants: {
          where: { status: 'ACTIVE' },
          select: { size: true, color: true, stockQuantity: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const items = rawItems.map(({ variants, ...product }) => {
    const sizeMap = new Map<string, (typeof variants)[number]['size']>();
    const colorMap = new Map<string, NonNullable<(typeof variants)[number]['color']>>();
    for (const variant of variants) {
      if (variant.size) sizeMap.set(variant.size.id, variant.size);
      if (variant.color) colorMap.set(variant.color.id, variant.color);
    }
    const sizes = [...sizeMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);
    const colors = [...colorMap.values()].sort((a, b) => a.name.localeCompare(b.name));
    const inStock = variants.some((v) => v.stockQuantity > 0);
    return { ...product, sizes, colors, inStock };
  });

  return { items, meta: buildMeta(page, limit, total) };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' }, include: { color: true } },
      variants: {
        include: { color: true, size: true },
      },
    },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  return product;
}

// Public, customer-storefront-only lookup (unlike getProductById, which the
// admin dashboard also uses to view/edit DRAFT and INACTIVE products) — so
// this one only ever returns a product a shopper is actually allowed to see.
// A DRAFT or deactivated product must not be publicly viewable or indexable
// at its slug URL just because the id-based admin endpoint can still see it.
// A LAUNCHING_SOON product is intentionally public (so it can be teased on
// the storefront) but not yet orderable — enforced separately in
// cart/order creation, not by hiding it here.
const PUBLIC_PRODUCT_STATUSES: ProductStatus[] = ['ACTIVE', 'LAUNCHING_SOON'];

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findUnique({
    where: { slug, status: { in: PUBLIC_PRODUCT_STATUSES } },
    include: {
      category: true,
      images: { orderBy: { sortOrder: 'asc' }, include: { color: true } },
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
