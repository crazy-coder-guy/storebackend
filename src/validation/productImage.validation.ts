import { z } from 'zod';

export const createProductImageSchema = z.object({
  imageUrl: z.string().url(),
  imageType: z.enum(['PRODUCT', 'MODEL', 'LIFESTYLE']).optional(),
  sortOrder: z.number().int().optional(),
  isPrimary: z.boolean().optional(),
});

export const updateProductImageSchema = createProductImageSchema.partial();

export const uploadProductImageSchema = z.object({
  imageType: z.enum(['PRODUCT', 'MODEL', 'LIFESTYLE']).optional(),
  sortOrder: z.coerce.number().int().optional(),
  isPrimary: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
});

export type CreateProductImageInput = z.infer<typeof createProductImageSchema>;
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;
export type UploadProductImageInput = z.infer<typeof uploadProductImageSchema>;
