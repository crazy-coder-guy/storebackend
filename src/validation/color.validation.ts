import { z } from 'zod';

export const createColorSchema = z.object({
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(20),
  hexCode: z.string().min(1).max(20),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateColorSchema = createColorSchema.partial();

export type CreateColorInput = z.infer<typeof createColorSchema>;
export type UpdateColorInput = z.infer<typeof updateColorSchema>;
