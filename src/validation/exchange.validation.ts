import { z } from 'zod';

export const createExchangeRequestSchema = z
  .object({
    orderItemId: z.string().uuid(),
    reason: z.enum(['DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'SIZE_FIT', 'OTHER']),
    description: z.string().max(2000).optional(),
  })
  .transform((data) => ({ ...data, description: data.description?.trim() ?? '' }))
  .refine((data) => data.reason !== 'OTHER' || data.description.length > 0, {
    message: 'Please describe the issue',
    path: ['description'],
  });

export type CreateExchangeRequestInput = z.infer<typeof createExchangeRequestSchema>;

export const updateExchangeStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED']),
  adminNote: z.string().max(2000).optional(),
});

export type UpdateExchangeStatusInput = z.infer<typeof updateExchangeStatusSchema>;
