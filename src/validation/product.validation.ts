import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().uuid(),
  productType: z.string().min(1).max(100),
  basePrice: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  badge: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'DRAFT']).optional(),
  gsm: z.number().int().positive().optional().nullable(),
  fabric: z.string().max(255).optional().nullable(),
  fit: z.enum(['REGULAR', 'SLIM', 'OVERSIZED', 'RELAXED']).optional().nullable(),
  neckType: z.enum(['CREW', 'V_NECK', 'POLO', 'ROUND', 'MOCK']).optional().nullable(),
  biowash: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
