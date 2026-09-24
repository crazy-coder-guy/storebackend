import { Router } from 'express';
import {
  createTemplate,
  deleteTemplate,
  getSubscriberCount,
  listNotifications,
  listSubscribers,
  listTemplates,
  sendNotification,
  subscribe,
  unsubscribe,
} from '../controllers/push.controller';
import { optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  sendNotificationSchema,
  subscribeSchema,
  unsubscribeSchema,
} from '../validation/push.validation';

const router = Router();

// Storefront-facing: any visitor who grants notification permission calls
// these. optionalAuth ties the subscription to the signed-in user, if any,
// without requiring sign-in to subscribe at all.
router.post('/subscribe', optionalAuth, validate(subscribeSchema), subscribe);
router.post('/unsubscribe', validate(unsubscribeSchema), unsubscribe);

// Admin-facing: composing and reviewing sent notifications.
router.post('/notifications', validate(sendNotificationSchema), sendNotification);
router.get('/notifications', listNotifications);
router.get('/subscriber-count', getSubscriberCount);
router.get('/subscribers', listSubscribers);

// Admin-facing: reusable notification templates.
router.get('/templates', listTemplates);
router.post('/templates', validate(createTemplateSchema), createTemplate);
router.delete('/templates/:id', deleteTemplate);

export default router;
