import { z } from 'zod';

export const subscribeNewsletterSchema = z.object({
  email: z.string().email(),
});

export type SubscribeNewsletterInput = z.infer<typeof subscribeNewsletterSchema>;

export const createCampaignSchema = z.object({
  subject: z.string().min(1).max(200),
  htmlContent: z.string().min(1),
  sendNow: z.boolean().default(true),
  scheduledAt: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
