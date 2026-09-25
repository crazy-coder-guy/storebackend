import { z } from 'zod';

export const saveAddressSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  shippingAddress: z.string().min(1),
});

export type SaveAddressInput = z.infer<typeof saveAddressSchema>;
