import { z } from 'zod';

export const updatePricingSettingsSchema = z.object({
  packagingCost: z.number().nonnegative().optional(),
  courierCost: z.number().nonnegative().optional(),
  paymentGatewayPercent: z.number().min(0).max(100).optional(),
  exchangeBuffer: z.number().nonnegative().optional(),
  miscCost: z.number().nonnegative().optional(),
  marketingCost: z.number().nonnegative().optional(),
  targetProfit: z.number().nonnegative().optional(),
  freeShippingThreshold: z.number().nonnegative().optional(),
  shippingCharge: z.number().nonnegative().optional(),
});

export const recommendPriceSchema = z.object({
  productCost: z.number().nonnegative(),
});

export type UpdatePricingSettingsInput = z.infer<typeof updatePricingSettingsSchema>;
export type RecommendPriceInput = z.infer<typeof recommendPriceSchema>;
