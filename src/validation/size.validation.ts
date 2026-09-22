import { z } from 'zod';

export const createSizeSchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(20),
  sortOrder: z.number().int().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateSizeSchema = createSizeSchema.partial();

export type CreateSizeInput = z.infer<typeof createSizeSchema>;
export type UpdateSizeInput = z.infer<typeof updateSizeSchema>;
