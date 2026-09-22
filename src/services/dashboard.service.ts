import { prisma } from '../database/prisma';

const activityInclude = {
  variant: {
    include: { product: true, size: true, color: true },
  },
} as const;

export async function getDashboardSummary(lowStockThreshold: number) {
  const [
    totalProducts,
    activeProducts,
    inactiveProducts,
    draftProducts,
    totalCategories,
    totalSizes,
    totalColors,
    stockAgg,
    lowStockCount,
    outOfStockCount,
    lowStockItems,
    recentActivity,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'INACTIVE' } }),
    prisma.product.count({ where: { status: 'DRAFT' } }),
    prisma.category.count({ where: { status: 'ACTIVE' } }),
    prisma.size.count({ where: { status: 'ACTIVE' } }),
    prisma.color.count({ where: { status: 'ACTIVE' } }),
    prisma.productVariant.aggregate({ _sum: { stockQuantity: true } }),
    prisma.productVariant.count({
      where: { stockQuantity: { lte: lowStockThreshold, gt: 0 }, status: 'ACTIVE' },
    }),
    prisma.productVariant.count({ where: { stockQuantity: 0, status: 'ACTIVE' } }),
    prisma.productVariant.findMany({
      where: { stockQuantity: { lte: lowStockThreshold }, status: 'ACTIVE' },
      include: { product: true, size: true, color: true },
      orderBy: { stockQuantity: 'asc' },
      take: 10,
    }),
    prisma.inventoryTransaction.findMany({
      include: activityInclude,
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  return {
    products: {
      total: totalProducts,
      active: activeProducts,
      inactive: inactiveProducts,
      draft: draftProducts,
    },
    inventory: {
      totalStock: stockAgg._sum.stockQuantity ?? 0,
      lowStock: lowStockCount,
      outOfStock: outOfStockCount,
    },
    catalog: {
      categories: totalCategories,
      sizes: totalSizes,
      colors: totalColors,
    },
    lowStockProducts: lowStockItems,
    recentActivity,
  };
}
