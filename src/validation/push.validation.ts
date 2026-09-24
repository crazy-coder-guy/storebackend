import { z } from 'zod';

export const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userId: z.string().optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  // Sends only to this user's subscriptions instead of broadcasting to everyone.
  userId: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
