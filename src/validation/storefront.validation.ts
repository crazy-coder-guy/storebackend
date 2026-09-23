import { z } from 'zod';

export const updateStorefrontSettingsSchema = z.object({
  announcementText: z.string().min(1).max(300).optional(),
  heroTitle: z.string().min(1).max(200).optional(),
  heroSubtitle: z.string().min(1).max(500).optional(),
});

export const setFeaturedProductsSchema = z.object({
  productIds: z.array(z.string().uuid()),
});

export type UpdateStorefrontSettingsInput = z.infer<typeof updateStorefrontSettingsSchema>;
export type SetFeaturedProductsInput = z.infer<typeof setFeaturedProductsSchema>;
