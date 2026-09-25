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

// The Notification API only renders the first 2 action buttons a browser
// supports (Chrome caps at 2), so more than that would silently be dropped.
export const notificationActionSchema = z.object({
  action: z.string().min(1).max(50),
  title: z.string().min(1).max(50),
  icon: z.string().url().optional(),
  // Falls back to the notification's own top-level url if omitted, so each
  // button can deep-link somewhere different (e.g. "View Order" vs "Shop Now").
  url: z.string().url().optional(),
});

export const sendNotificationSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  actions: z.array(notificationActionSchema).max(2).optional(),
  // Sends only to this user's subscriptions instead of broadcasting to everyone.
  userId: z.string().optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().url().optional(),
  image: z.string().url().optional(),
  actions: z.array(notificationActionSchema).max(2).optional(),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
export type NotificationAction = z.infer<typeof notificationActionSchema>;
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
