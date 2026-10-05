import { prisma } from '../database/prisma';
import { calculateRecommendedSellingPrice } from '../utils/pricing';
import { UpdatePricingSettingsInput } from '../validation/pricing.validation';

const SETTINGS_ID = 'default';

// Mirrors the field defaults already declared in the Prisma schema
// (PricingSetting model) — kept here too so a fresh row created via upsert
// is explicit about its values rather than relying solely on the DB default.
const DEFAULT_SETTINGS = {
  packagingCost: 20,
  courierCost: 65,
  paymentGatewayPercent: 2.5,
  exchangeBuffer: 20,
  miscCost: 10,
  marketingCost: 75,
  targetProfit: 150,
  freeShippingThreshold: 999,
  shippingCharge: 59,
};

export async function getPricingSettings() {
  return prisma.pricingSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID, ...DEFAULT_SETTINGS },
  });
}

export async function updatePricingSettings(input: UpdatePricingSettingsInput) {
  await getPricingSettings();
  return prisma.pricingSetting.update({ where: { id: SETTINGS_ID }, data: input });
}

export async function recommendSellingPrice(productCost: number) {
  const settings = await getPricingSettings();
  return calculateRecommendedSellingPrice(productCost, settings);
}
