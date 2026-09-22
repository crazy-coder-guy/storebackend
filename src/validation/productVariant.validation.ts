import { z } from 'zod';

export const createProductVariantSchema = z.object({
  colorId: z.string().uuid(),
  sizeId: z.string().uuid(),
  sku: z.string().min(1).max(100).optional(),
  price: z.number().nonnegative().optional().nullable(),
  stockQuantity: z.number().int().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateProductVariantSchema = createProductVariantSchema.partial();

export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
