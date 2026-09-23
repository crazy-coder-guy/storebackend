import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { slugToSkuFragment } from '../utils/slug';
import {
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from '../validation/productVariant.validation';

async function getProductOrThrow(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
  return product;
}

export async function listProductVariants(productId: string) {
  await getProductOrThrow(productId);
  return prisma.productVariant.findMany({
    where: { productId },
    include: { color: true, size: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getVariantById(productId: string, variantId: string) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId },
    include: { color: true, size: true },
  });
  if (!variant) throw new AppError(404, 'NOT_FOUND', 'Product variant not found');
  return variant;
}

async function generateSku(productSlug: string, colorCode: string, sizeCode: string) {
  const fragment = slugToSkuFragment(productSlug, 2);
  const base = `${fragment}-${colorCode}-${sizeCode}`.toUpperCase();

  let sku = base;
  let suffix = 1;
  // Ensure uniqueness in the unlikely event of a collision
  while (await prisma.productVariant.findUnique({ where: { sku } })) {
    suffix += 1;
    sku = `${base}-${suffix}`;
  }
  return sku;
}

export async function createProductVariant(productId: string, input: CreateProductVariantInput) {
  const product = await getProductOrThrow(productId);

  const [color, size] = await Promise.all([
    prisma.color.findUnique({ where: { id: input.colorId } }),
    prisma.size.findUnique({ where: { id: input.sizeId } }),
  ]);
  if (!color) throw new AppError(422, 'INVALID_COLOR', 'colorId does not reference an existing color');
  if (!size) throw new AppError(422, 'INVALID_SIZE', 'sizeId does not reference an existing size');

  const existingCombo = await prisma.productVariant.findUnique({
    where: {
      productId_colorId_sizeId: {
        productId,
        colorId: input.colorId,
        sizeId: input.sizeId,
      },
    },
  });
  if (existingCombo) {
    throw new AppError(
      409,
      'DUPLICATE_VARIANT',
      'A variant with this product/color/size combination already exists'
    );
  }

  const sku = input.sku
    ? input.sku.toUpperCase()
    : await generateSku(product.slug, color.code, size.code);

  if (input.sku) {
    const existingSku = await prisma.productVariant.findUnique({ where: { sku } });
    if (existingSku) throw new AppError(409, 'DUPLICATE_SKU', `SKU ${sku} is already in use`);
  }

  return prisma.productVariant.create({
    data: {
      productId,
      colorId: input.colorId,
      sizeId: input.sizeId,
      sku,
      price: input.price ?? null,
      stockQuantity: input.stockQuantity ?? 0,
      badge: input.badge ?? null,
      status: input.status,
    },
    include: { color: true, size: true },
  });
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: UpdateProductVariantInput
) {
  await getVariantById(productId, variantId);

  const data: Prisma.ProductVariantUncheckedUpdateInput = { ...input };
  if (input.sku) data.sku = input.sku.toUpperCase();

  return prisma.productVariant.update({
    where: { id: variantId },
    data,
    include: { color: true, size: true },
  });
}

export async function softDeleteProductVariant(productId: string, variantId: string) {
  await getVariantById(productId, variantId);
  return prisma.productVariant.update({
    where: { id: variantId },
    data: { status: 'INACTIVE' },
  });
}
