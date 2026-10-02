import { z } from 'zod';

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores')
      .transform((v) => v.toUpperCase()),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive(),
    minOrderValue: z.number().nonnegative().optional(),
    maxDiscountAmount: z.number().positive().optional(),
    usageLimit: z.number().int().positive().optional(),
    perUserLimit: z.number().int().positive().optional(),
    expiresAt: z.coerce.date().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .refine((data) => data.type !== 'PERCENTAGE' || data.value <= 100, {
    message: 'A percentage coupon cannot be worth more than 100',
    path: ['value'],
  });

export const updateCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores')
      .transform((v) => v.toUpperCase())
      .optional(),
    type: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    value: z.number().positive().optional(),
    minOrderValue: z.number().nonnegative().nullable().optional(),
    maxDiscountAmount: z.number().positive().nullable().optional(),
    usageLimit: z.number().int().positive().nullable().optional(),
    perUserLimit: z.number().int().positive().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .refine((data) => data.type !== 'PERCENTAGE' || data.value === undefined || data.value <= 100, {
    message: 'A percentage coupon cannot be worth more than 100',
    path: ['value'],
  });

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(30),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
