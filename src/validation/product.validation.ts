import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid(),
  productType: z.string().min(1).max(100),
  basePrice: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
