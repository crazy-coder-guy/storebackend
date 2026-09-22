import { z } from 'zod';

export const createProductImageSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.enum(['PRODUCT', 'MODEL', 'LIFESTYLE']).optional(),
  sortOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
});

export const updateProductImageSchema = createProductImageSchema.partial();

export type CreateProductImageInput = z.infer<typeof createProductImageSchema>;
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;
