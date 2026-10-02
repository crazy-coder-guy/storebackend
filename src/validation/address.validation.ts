import { z } from 'zod';

export const saveAddressSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().min(1).max(50),
  doorNumber: z.string().min(1).max(255),
  streetName: z.string().min(1).max(255),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits'),
});

export type SaveAddressInput = z.infer<typeof saveAddressSchema>;
