// Pure pricing/profit math — no DB access here (settings are fetched by the
// caller via pricing.service.ts and passed in), so this stays trivially
// testable and reusable from order creation, the admin product form's live
// preview, and dashboard profitability aggregation alike.
import { Prisma } from '@prisma/client';

export interface PricingSettingsLike {
  packagingCost: Prisma.Decimal | number;
  courierCost: Prisma.Decimal | number;
  paymentGatewayPercent: Prisma.Decimal | number;
  exchangeBuffer: Prisma.Decimal | number;
  miscCost: Prisma.Decimal | number;
  marketingCost: Prisma.Decimal | number;
  targetProfit: Prisma.Decimal | number;
  freeShippingThreshold: Prisma.Decimal | number;
  shippingCharge: Prisma.Decimal | number;
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Order-level shipping charge to the customer — free above the configured
 * threshold, flat charge below it. This is the only pricing concept the
 * storefront/customer ever sees; everything else in this file is internal
 * cost/margin math.
 */
export function calculateDeliveryFee(subtotal: number, settings: PricingSettingsLike): number {
  const threshold = toNumber(settings.freeShippingThreshold);
  const charge = toNumber(settings.shippingCharge);
  return subtotal >= threshold ? 0 : charge;
}

/**
 * Rounds up to the nearest clean retail price ending in 49 or 99
 * (449, 499, 549, 599, 649, 699, ...) — i.e. round up to the nearest
 * multiple of 50, then step back by 1.
 */
export function roundToRetailPrice(rawPrice: number): number {
  if (rawPrice <= 0) return 0;
  return Math.ceil(rawPrice / 50) * 50 - 1;
}

export interface RecommendedPriceBreakdown {
  productCost: number;
  packagingCost: number;
  courierCost: number;
  exchangeBuffer: number;
  miscCost: number;
  marketingCost: number;
  fixedCost: number;
  targetProfit: number;
  paymentGatewayPercent: number;
  rawSellingPrice: number;
  recommendedSellingPrice: number;
}

/**
 * fixedCost = productCost + packagingCost + courierCost + exchangeBuffer + miscCost + marketingCost
 * sellingPrice = (fixedCost + targetProfit) / (1 - paymentGatewayPercent)
 * — solving for the price where, after the gateway takes its cut of the
 * sale, the remaining amount still covers every fixed cost plus the target
 * profit. Rounded to a clean retail price for display/use as the suggestion.
 */
export function calculateRecommendedSellingPrice(
  productCost: number,
  settings: PricingSettingsLike
): RecommendedPriceBreakdown {
  const packagingCost = toNumber(settings.packagingCost);
  const courierCost = toNumber(settings.courierCost);
  const exchangeBuffer = toNumber(settings.exchangeBuffer);
  const miscCost = toNumber(settings.miscCost);
  const marketingCost = toNumber(settings.marketingCost);
  const targetProfit = toNumber(settings.targetProfit);
  const paymentGatewayPercent = toNumber(settings.paymentGatewayPercent);

  const fixedCost = productCost + packagingCost + courierCost + exchangeBuffer + miscCost + marketingCost;
  const gatewayFraction = paymentGatewayPercent / 100;
  const rawSellingPrice =
    gatewayFraction < 1 ? (fixedCost + targetProfit) / (1 - gatewayFraction) : fixedCost + targetProfit;

  return {
    productCost,
    packagingCost,
    courierCost,
    exchangeBuffer,
    miscCost,
    marketingCost,
    fixedCost,
    targetProfit,
    paymentGatewayPercent,
    rawSellingPrice,
    recommendedSellingPrice: roundToRetailPrice(rawSellingPrice),
  };
}

export interface ProductProfitBreakdown {
  totalCost: number;
  paymentGatewayFee: number;
  expectedProfit: number;
  profitMarginPercent: number;
}

/**
 * What a single unit actually nets at its real (possibly admin-overridden)
 * selling price — used for the admin product form's live "Expected Profit /
 * Profit Margin %" preview. Courier/packaging/marketing/exchange/misc are
 * treated as this one unit's full share (the per-order amortization across
 * multiple items only applies once a real multi-item order exists; see
 * calculateOrderProfit).
 */
export function calculateProductProfit(
  actualSellingPrice: number,
  productCost: number,
  settings: PricingSettingsLike
): ProductProfitBreakdown {
  const packagingCost = toNumber(settings.packagingCost);
  const courierCost = toNumber(settings.courierCost);
  const exchangeBuffer = toNumber(settings.exchangeBuffer);
  const miscCost = toNumber(settings.miscCost);
  const marketingCost = toNumber(settings.marketingCost);
  const paymentGatewayPercent = toNumber(settings.paymentGatewayPercent);

  const paymentGatewayFee = (actualSellingPrice * paymentGatewayPercent) / 100;
  const totalCost = productCost + packagingCost + courierCost + paymentGatewayFee + exchangeBuffer + miscCost + marketingCost;
  const expectedProfit = actualSellingPrice - totalCost;
  const profitMarginPercent = actualSellingPrice > 0 ? (expectedProfit / actualSellingPrice) * 100 : 0;

  return { totalCost, paymentGatewayFee, expectedProfit, profitMarginPercent };
}

export interface OrderProfitBreakdown {
  productCostTotal: number;
  packagingCost: number;
  courierCost: number;
  paymentGatewayFee: number;
  marketingCost: number;
  exchangeBuffer: number;
  miscCost: number;
  shippingFee: number;
  netContribution: number;
  netContributionPercent: number;
}

/**
 * Order-level profit. Courier/packaging/exchange-buffer/misc/marketing are
 * each charged exactly ONCE per order regardless of how many line items or
 * units it contains — only productCostTotal (the sum of each line's
 * costPrice * quantity) scales with quantity. Payment gateway fee is a
 * percentage of what was actually charged (totalAmount, which already
 * includes shippingFee), matching how real payment gateways bill.
 */
export function calculateOrderProfit(
  totalAmount: number,
  productCostTotal: number,
  shippingFee: number,
  settings: PricingSettingsLike
): OrderProfitBreakdown {
  const packagingCost = toNumber(settings.packagingCost);
  const courierCost = toNumber(settings.courierCost);
  const exchangeBuffer = toNumber(settings.exchangeBuffer);
  const miscCost = toNumber(settings.miscCost);
  const marketingCost = toNumber(settings.marketingCost);
  const paymentGatewayPercent = toNumber(settings.paymentGatewayPercent);
  const paymentGatewayFee = (totalAmount * paymentGatewayPercent) / 100;

  const totalCost =
    productCostTotal + packagingCost + courierCost + paymentGatewayFee + exchangeBuffer + miscCost + marketingCost;
  const netContribution = totalAmount - totalCost;
  const netContributionPercent = totalAmount > 0 ? (netContribution / totalAmount) * 100 : 0;

  return {
    productCostTotal,
    packagingCost,
    courierCost,
    paymentGatewayFee,
    marketingCost,
    exchangeBuffer,
    miscCost,
    shippingFee,
    netContribution,
    netContributionPercent,
  };
}
