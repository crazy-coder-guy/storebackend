import { z } from 'zod';

export const createProductVariantSchema = z.object({
  colorId: z.string().uuid().optional().nullable(),
  sizeId: z.string().uuid(),
  sku: z.string().min(1).max(100).optional(),
  price: z.number().nonnegative().optional().nullable(),
  stockQuantity: z.number().int().nonnegative().optional(),
  badge: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  // Garment measurements (inches)
  chestWidth: z.number().nonnegative().optional().nullable(),
  bodyLength: z.number().nonnegative().optional().nullable(),
  sleeveLength: z.number().nonnegative().optional().nullable(),
  shoulderWidth: z.number().nonnegative().optional().nullable(),
});

export const updateProductVariantSchema = createProductVariantSchema.partial();

export type CreateProductVariantInput = z.infer<typeof createProductVariantSchema>;
export type UpdateProductVariantInput = z.infer<typeof updateProductVariantSchema>;
