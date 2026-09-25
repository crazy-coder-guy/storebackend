import { Router } from 'express';
import {
  createCampaign,
  deleteSubscriber,
  listCampaigns,
  listSubscribers,
  subscribe,
  syncSubscribers,
} from '../controllers/newsletter.controller';
import { validate } from '../middleware/validate';
import { createCampaignSchema, subscribeNewsletterSchema } from '../validation/newsletter.validation';

const router = Router();

// Storefront-facing: the footer "Stay Connected" form.
router.post('/subscribe', validate(subscribeNewsletterSchema), subscribe);

// Admin-facing (no auth layer here yet, matching this backend's other admin endpoints).
router.get('/subscribers', listSubscribers);
router.delete('/subscribers/:id', deleteSubscriber);
router.post('/subscribers/sync', syncSubscribers);
router.get('/campaigns', listCampaigns);
router.post('/campaigns', validate(createCampaignSchema), createCampaign);

export default router;
