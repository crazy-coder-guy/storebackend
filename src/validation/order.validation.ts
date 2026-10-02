import { z } from 'zod';

export const orderItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerPhone: z.string().min(1).max(50),
  doorNumber: z.string().min(1).max(255),
  streetName: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
  paymentStatus: z.enum(['PAID', 'UNPAID', 'REFUNDED']).optional(),
  items: z.array(orderItemInputSchema).min(1, 'At least one item is required'),
  couponCode: z.string().min(1).max(30).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
