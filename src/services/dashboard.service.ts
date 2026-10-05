import { Prisma } from '@prisma/client';
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

interface DayRow {
  date: Date;
  revenue: Prisma.Decimal | null;
  net_profit: Prisma.Decimal | null;
  order_count: bigint;
}

// One row per calendar day in the window, zero-filled where there were no
// orders — a chart needs a continuous date axis, not just the days that
// happen to have data, or gaps read as missing data rather than "zero".
export async function getProfitabilityTimeseries(days: number) {
  const rows = await prisma.$queryRaw<DayRow[]>`
    SELECT
      d::date AS date,
      COALESCE(SUM(o.total_amount), 0) AS revenue,
      COALESCE(SUM(o.net_contribution), 0) AS net_profit,
      COUNT(o.id) AS order_count
    FROM generate_series(
      (CURRENT_DATE - (${days - 1} || ' days')::interval),
      CURRENT_DATE,
      interval '1 day'
    ) AS d
    LEFT JOIN orders o
      ON o.created_at::date = d::date
      AND o.status != 'CANCELLED'
    GROUP BY d
    ORDER BY d;
  `;

  return rows.map((row) => ({
    date: row.date.toISOString().slice(0, 10),
    revenue: Number(row.revenue ?? 0),
    netProfit: Number(row.net_profit ?? 0),
    orderCount: Number(row.order_count),
  }));
}

interface TopProductRow {
  product_id: string;
  name: string;
  units: bigint;
  revenue: Prisma.Decimal | null;
}

// Ranked by revenue within the window — units sold come along for the
// tooltip/secondary label, not as the sort key.
export async function getTopProducts(days: number, limit: number) {
  const rows = await prisma.$queryRaw<TopProductRow[]>`
    SELECT
      p.id AS product_id,
      p.name AS name,
      SUM(oi.quantity) AS units,
      SUM(oi.unit_price * oi.quantity) AS revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    WHERE o.status != 'CANCELLED'
      AND o.created_at >= (CURRENT_DATE - (${days - 1} || ' days')::interval)
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT ${limit};
  `;

  return rows.map((row) => ({
    productId: row.product_id,
    name: row.name,
    units: Number(row.units),
    revenue: Number(row.revenue ?? 0),
  }));
}

interface CategoryPerformanceRow {
  category_id: string;
  name: string;
  revenue: Prisma.Decimal | null;
  gross_profit: Prisma.Decimal | null;
}

// "Gross profit" here is per-item (unitPrice - costPrice) * quantity — it
// deliberately excludes order-level costs (courier/packaging/gateway/
// marketing) which aren't attributable to a single category, unlike the
// order-level "Net Profit" used elsewhere on this dashboard.
export async function getCategoryPerformance(days: number) {
  const rows = await prisma.$queryRaw<CategoryPerformanceRow[]>`
    SELECT
      c.id AS category_id,
      c.name AS name,
      SUM(oi.unit_price * oi.quantity) AS revenue,
      SUM((oi.unit_price - oi.cost_price) * oi.quantity) AS gross_profit
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN product_variants pv ON pv.id = oi.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN categories c ON c.id = p.category_id
    WHERE o.status != 'CANCELLED'
      AND o.created_at >= (CURRENT_DATE - (${days - 1} || ' days')::interval)
    GROUP BY c.id, c.name
    ORDER BY revenue DESC;
  `;

  return rows.map((row) => ({
    categoryId: row.category_id,
    name: row.name,
    revenue: Number(row.revenue ?? 0),
    grossProfit: Number(row.gross_profit ?? 0),
  }));
}

export async function getOrderStatusBreakdown(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [byStatus, byPaymentStatus] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ['paymentStatus'],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);

  return {
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byPaymentStatus: byPaymentStatus.map((row) => ({
      paymentStatus: row.paymentStatus,
      count: row._count._all,
    })),
  };
}
