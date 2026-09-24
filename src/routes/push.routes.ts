import { Router } from 'express';
import {
  getSubscriberCount,
  listNotifications,
  sendNotification,
  subscribe,
  unsubscribe,
} from '../controllers/push.controller';
import { validate } from '../middleware/validate';
import { sendNotificationSchema, subscribeSchema, unsubscribeSchema } from '../validation/push.validation';

const router = Router();

// Storefront-facing: any visitor who grants notification permission calls these.
router.post('/subscribe', validate(subscribeSchema), subscribe);
router.post('/unsubscribe', validate(unsubscribeSchema), unsubscribe);

// Admin-facing: composing and reviewing sent notifications.
router.post('/notifications', validate(sendNotificationSchema), sendNotification);
router.get('/notifications', listNotifications);
router.get('/subscriber-count', getSubscriberCount);

export default router;
