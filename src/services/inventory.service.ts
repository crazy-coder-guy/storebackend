import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { buildMeta } from '../utils/pagination';
import { AdjustStockInput } from '../validation/inventory.validation';

interface ListInventoryParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
  sku?: string;
  productId?: string;
  productName?: string;
  sizeId?: string;
  colorId?: string;
}

const variantInclude = {
  product: true,
  size: true,
  color: true,
} satisfies Prisma.ProductVariantInclude;

export async function listInventory(params: ListInventoryParams) {
  const { page, limit, skip, take, sku, productId, productName, sizeId, colorId } = params;

  const where: Prisma.ProductVariantWhereInput = {
    ...(sku ? { sku: { contains: sku, mode: 'insensitive' } } : {}),
    ...(productId ? { productId } : {}),
    ...(sizeId ? { sizeId } : {}),
    ...(colorId ? { colorId } : {}),
    ...(productName ? { product: { name: { contains: productName, mode: 'insensitive' } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      skip,
      take,
      include: variantInclude,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.productVariant.count({ where }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}

export async function listLowStock(threshold: number) {
  return prisma.productVariant.findMany({
    where: { stockQuantity: { lte: threshold }, status: 'ACTIVE' },
    include: variantInclude,
    orderBy: { stockQuantity: 'asc' },
  });
}

export async function listOutOfStock() {
  return prisma.productVariant.findMany({
    where: { stockQuantity: 0, status: 'ACTIVE' },
    include: variantInclude,
    orderBy: { createdAt: 'desc' },
  });
}

async function getVariantOrThrow(variantId: string) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) throw new AppError(404, 'NOT_FOUND', 'Product variant not found');
  return variant;
}

export async function adjustStock(variantId: string, input: AdjustStockInput) {
  const variant = await getVariantOrThrow(variantId);
  const previousStock = variant.stockQuantity;
  let newStock: number;

  switch (input.type as TransactionType) {
    case 'RESTOCK':
    case 'MANUAL_INCREASE':
      newStock = previousStock + input.quantity;
      break;
    case 'MANUAL_DECREASE':
      newStock = previousStock - input.quantity;
      if (newStock < 0) {
        throw new AppError(
          422,
          'INSUFFICIENT_STOCK',
          `Cannot decrease stock by ${input.quantity}; only ${previousStock} in stock`
        );
      }
      break;
    case 'ADJUSTMENT':
      newStock = Math.abs(input.quantity);
      break;
    default:
      throw new AppError(422, 'VALIDATION_ERROR', 'Invalid transaction type');
  }

  const [updatedVariant, transaction] = await prisma.$transaction([
    prisma.productVariant.update({
      where: { id: variantId },
      data: { stockQuantity: newStock },
    }),
    prisma.inventoryTransaction.create({
      data: {
        variantId,
        transactionType: input.type,
        quantity: input.quantity,
        previousStock,
        newStock,
        reason: input.reason ?? null,
      },
    }),
  ]);

  return { variant: updatedVariant, transaction };
}

export async function getVariantHistory(
  variantId: string,
  params: { page: number; limit: number; skip: number; take: number }
) {
  await getVariantOrThrow(variantId);
  const { page, limit, skip, take } = params;

  const [items, total] = await Promise.all([
    prisma.inventoryTransaction.findMany({
      where: { variantId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryTransaction.count({ where: { variantId } }),
  ]);

  return { items, meta: buildMeta(page, limit, total) };
}
