#!/usr/bin/env node
// Runs on every boot (via the Dockerfile CMD) so pricing stays correct with
// zero manual admin action: recomputes basePrice/variant price for every
// product/variant that has a cost price set, using current pricing_settings.
// Idempotent and cheap — a product with no cost price is left untouched
// (there's nothing to compute from), and recomputing an already-correct
// price just writes the same value back.

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mirrors src/utils/pricing.ts's calculateRecommendedSellingPrice — kept as
// plain JS here since this script runs standalone in the production image
// without ts-node.
function roundToRetailPrice(rawPrice) {
  if (rawPrice <= 0) return 0;
  return Math.ceil(rawPrice / 50) * 50 - 1;
}

function recommendedPrice(productCost, settings) {
  const fixedCost =
    productCost +
    Number(settings.packagingCost) +
    Number(settings.courierCost) +
    Number(settings.exchangeBuffer) +
    Number(settings.miscCost) +
    Number(settings.marketingCost);
  const gatewayFraction = Number(settings.paymentGatewayPercent) / 100;
  const raw = gatewayFraction < 1 ? (fixedCost + Number(settings.targetProfit)) / (1 - gatewayFraction) : fixedCost + Number(settings.targetProfit);
  return roundToRetailPrice(raw);
}

async function main() {
  const settings = await prisma.pricingSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  const products = await prisma.product.findMany({ where: { costPrice: { not: null } } });
  let productsUpdated = 0;
  for (const product of products) {
    const costPrice = Number(product.costPrice);
    if (!(costPrice > 0)) continue;
    const basePrice = recommendedPrice(costPrice, settings);
    if (Number(product.basePrice) !== basePrice) {
      await prisma.product.update({ where: { id: product.id }, data: { basePrice } });
      productsUpdated += 1;
    }
  }

  const variants = await prisma.productVariant.findMany({ where: { costPrice: { not: null } } });
  let variantsUpdated = 0;
  for (const variant of variants) {
    const costPrice = Number(variant.costPrice);
    if (!(costPrice > 0)) continue;
    const price = recommendedPrice(costPrice, settings);
    if (Number(variant.price ?? -1) !== price) {
      await prisma.productVariant.update({ where: { id: variant.id }, data: { price } });
      variantsUpdated += 1;
    }
  }

  console.log(`[recalculate-prices] ${productsUpdated} product(s), ${variantsUpdated} variant(s) updated.`);
}

main()
  .catch((err) => {
    // Non-fatal — a pricing recalc failure must never block the server from
    // starting. The next boot will simply try again.
    console.error('[recalculate-prices] failed, continuing boot:', err);
  })
  .finally(() => prisma.$disconnect());
