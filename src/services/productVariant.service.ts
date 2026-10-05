import { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { slugToSkuFragment } from '../utils/slug';
import { calculateRecommendedSellingPrice } from '../utils/pricing';
import { getPricingSettings } from './pricing.service';
import {
  CreateProductVariantInput,
  UpdateProductVariantInput,
} from '../validation/productVariant.validation';

// Mirrors product.service.ts's resolveBasePrice — when this specific variant
// overrides the product's cost price, its own selling-price override is
// mandatorily derived from that cost too, not freely chosen. A variant with
// no cost override keeps falling back to the product's (already-derived)
// basePrice via `price: null`, so nothing changes for the common case.
async function resolveVariantPrice(costPrice: number): Promise<number> {
  const settings = await getPricingSettings();
  return calculateRecommendedSellingPrice(costPrice, settings).recommendedSellingPrice;
}

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

async function generateSku(productSlug: string, colorCode: string | null | undefined, sizeCode: string) {
  const fragment = slugToSkuFragment(productSlug, 2);
  const base = colorCode
    ? `${fragment}-${colorCode}-${sizeCode}`.toUpperCase()
    : `${fragment}-${sizeCode}`.toUpperCase();

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
    input.colorId ? prisma.color.findUnique({ where: { id: input.colorId } }) : Promise.resolve(null),
    prisma.size.findUnique({ where: { id: input.sizeId } }),
  ]);
  if (input.colorId && !color) {
    throw new AppError(422, 'INVALID_COLOR', 'colorId does not reference an existing color');
  }
  if (!size) {
    throw new AppError(422, 'INVALID_SIZE', 'sizeId does not reference an existing size');
  }

  const existingCombo = await prisma.productVariant.findFirst({
    where: {
      productId,
      colorId: input.colorId ?? null,
      sizeId: input.sizeId,
    },
  });
  if (existingCombo) {
    throw new AppError(
      409,
      'DUPLICATE_VARIANT',
      input.colorId
        ? 'A variant with this product/color/size combination already exists'
        : 'A variant with this product/size combination already exists'
    );
  }

  const sku = input.sku
    ? input.sku.toUpperCase()
    : await generateSku(product.slug, color?.code, size.code);

  if (input.sku) {
    const existingSku = await prisma.productVariant.findUnique({ where: { sku } });
    if (existingSku) throw new AppError(409, 'DUPLICATE_SKU', `SKU ${sku} is already in use`);
  }

  const variantCostPrice = input.costPrice ?? null;
  const price =
    variantCostPrice && variantCostPrice > 0 ? await resolveVariantPrice(variantCostPrice) : input.price ?? null;

  return prisma.productVariant.create({
    data: {
      productId,
      colorId: input.colorId ?? null,
      sizeId: input.sizeId,
      sku,
      price,
      costPrice: variantCostPrice,
      stockQuantity: input.stockQuantity ?? 0,
      badge: input.badge ?? null,
      status: input.status,
      chestWidth: input.chestWidth ?? null,
      bodyLength: input.bodyLength ?? null,
      sleeveLength: input.sleeveLength ?? null,
      shoulderWidth: input.shoulderWidth ?? null,
    },
    include: { color: true, size: true },
  });
}

export async function updateProductVariant(
  productId: string,
  variantId: string,
  input: UpdateProductVariantInput
) {
  const existing = await getVariantById(productId, variantId);
  if (input.colorId) {
    const color = await prisma.color.findUnique({ where: { id: input.colorId } });
    if (!color) throw new AppError(422, 'INVALID_COLOR', 'colorId does not reference an existing color');
  }
  if (input.sizeId) {
    const size = await prisma.size.findUnique({ where: { id: input.sizeId } });
    if (!size) throw new AppError(422, 'INVALID_SIZE', 'sizeId does not reference an existing size');
  }

  const data: Prisma.ProductVariantUncheckedUpdateInput = { ...input };
  if (input.sku) data.sku = input.sku.toUpperCase();

  const effectiveCostPrice = input.costPrice !== undefined ? input.costPrice : Number(existing.costPrice ?? 0);
  if (effectiveCostPrice && effectiveCostPrice > 0) {
    data.price = await resolveVariantPrice(effectiveCostPrice);
  }

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
