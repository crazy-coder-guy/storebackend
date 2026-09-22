import { z } from 'zod';

export const adjustStockSchema = z.object({
  type: z.enum(['RESTOCK', 'MANUAL_INCREASE', 'MANUAL_DECREASE', 'ADJUSTMENT']),
  quantity: z.number().int(),
  reason: z.string().optional().nullable(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
