import { prisma } from '../database/prisma';
import { AppError } from '../utils/AppError';

export async function listFavorites(userId: string) {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  });
  return favorites.map((f) => f.productId);
}

export async function addFavorite(userId: string, productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new AppError(404, 'NOT_FOUND', 'Product not found');

  await prisma.favorite.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });

  return listFavorites(userId);
}

export async function removeFavorite(userId: string, productId: string) {
  await prisma.favorite.deleteMany({ where: { userId, productId } });
  return listFavorites(userId);
}

export async function clearFavorites(userId: string) {
  await prisma.favorite.deleteMany({ where: { userId } });
  return [] as string[];
}
