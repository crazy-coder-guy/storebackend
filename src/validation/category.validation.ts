import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  badge: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoryQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
