import { z } from 'zod';

export const orderItemInputSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  customerName: z.string().min(1).max(255),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1).max(50),
  shippingAddress: z.string().min(1),
  paymentStatus: z.enum(['PAID', 'UNPAID', 'REFUNDED']).optional(),
  items: z.array(orderItemInputSchema).min(1, 'At least one item is required'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
