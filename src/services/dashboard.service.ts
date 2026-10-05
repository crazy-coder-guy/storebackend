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

interface ProfitabilityParams {
  from?: Date;
  to?: Date;
}

// Every non-cancelled order counts toward profitability — a cancelled order
// is fully reversed (stock restored, coupon freed) and never represents
// realized revenue or cost, unlike PENDING/PROCESSING/SHIPPED/DELIVERED
// which all represent a committed sale.
export async function getProfitabilitySummary(params: ProfitabilityParams = {}) {
  const { from, to } = params;
  const where = {
    status: { not: 'CANCELLED' as const },
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [agg, orderCount] = await Promise.all([
    prisma.order.aggregate({
      where,
      _sum: {
        totalAmount: true,
        productCostTotal: true,
        courierCost: true,
        packagingCost: true,
        paymentGatewayFee: true,
        marketingCost: true,
        exchangeBuffer: true,
        miscCost: true,
        netContribution: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalRevenue = Number(agg._sum.totalAmount ?? 0);
  const netProfit = Number(agg._sum.netContribution ?? 0);

  return {
    orderCount,
    totalRevenue,
    totalProductCost: Number(agg._sum.productCostTotal ?? 0),
    totalCourierCost: Number(agg._sum.courierCost ?? 0),
    totalPackagingCost: Number(agg._sum.packagingCost ?? 0),
    totalPaymentGatewayFees: Number(agg._sum.paymentGatewayFee ?? 0),
    totalMarketingSpend: Number(agg._sum.marketingCost ?? 0),
    totalExchangeCost: Number(agg._sum.exchangeBuffer ?? 0),
    totalMiscCost: Number(agg._sum.miscCost ?? 0),
    netProfit,
    averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
    averageProfitPerOrder: orderCount > 0 ? netProfit / orderCount : 0,
    averageProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
}
