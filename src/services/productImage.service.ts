import { randomUUID } from 'crypto';
import path from 'path';
import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';
import { uploadObject } from '../utils/s3';
import {
  CreateProductImageInput,
  UpdateProductImageInput,
  UploadProductImageInput,
} from '../validation/productImage.validation';

async function assertProductExists(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');
}

async function assertColorExists(colorId: string) {
  const color = await prisma.color.findUnique({ where: { id: colorId } });
  if (!color) throw new AppError(422, 'INVALID_COLOR', 'colorId does not reference an existing color');
}

export async function listProductImages(productId: string) {
  await assertProductExists(productId);
  return prisma.productImage.findMany({
    where: { productId },
    include: { color: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createProductImage(productId: string, input: CreateProductImageInput) {
  await assertProductExists(productId);
  if (input.colorId) await assertColorExists(input.colorId);
  return prisma.productImage.create({
    data: {
      productId,
      colorId: input.colorId ?? null,
      imageUrl: input.imageUrl,
      imageType: input.imageType ?? 'PRODUCT',
      sortOrder: input.sortOrder ?? 0,
      isPrimary: input.isPrimary ?? false,
    },
    include: { color: true },
  });
}

export async function uploadProductImage(
  productId: string,
  file: Express.Multer.File,
  input: UploadProductImageInput
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

  if (input.colorId) await assertColorExists(input.colorId);

  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const key = `products/${product.category.slug}/${product.slug}/${randomUUID()}${ext}`;
  const imageUrl = await uploadObject(key, file.buffer, file.mimetype);

  return prisma.productImage.create({
    data: {
      productId,
      colorId: input.colorId ?? null,
      imageUrl,
      imageType: input.imageType ?? 'PRODUCT',
      sortOrder: input.sortOrder ?? 0,
      isPrimary: input.isPrimary ?? false,
    },
    include: { color: true },
  });
}

async function getImageOrThrow(productId: string, imageId: string) {
  const image = await prisma.productImage.findFirst({ where: { id: imageId, productId } });
  if (!image) throw new AppError(404, 'NOT_FOUND', 'Product image not found');
  return image;
}

export async function updateProductImage(
  productId: string,
  imageId: string,
  input: UpdateProductImageInput
) {
  await getImageOrThrow(productId, imageId);
  if (input.colorId) await assertColorExists(input.colorId);
  return prisma.productImage.update({ where: { id: imageId }, data: input, include: { color: true } });
}

export async function deleteProductImage(productId: string, imageId: string) {
  await getImageOrThrow(productId, imageId);
  await prisma.productImage.delete({ where: { id: imageId } });
}
