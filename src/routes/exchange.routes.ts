import { Router } from 'express';
import {
  cancelOwnExchangeRequest,
  createExchangeRequest,
  listAllExchangeRequests,
  listEligibleItems,
  listMyExchangeRequests,
  updateExchangeStatus,
} from '../controllers/exchange.controller';
import { requireAuth } from '../middleware/auth';
import { exchangeUpload } from '../middleware/exchangeUpload';
import { validate } from '../middleware/validate';
import { createExchangeRequestSchema, updateExchangeStatusSchema } from '../validation/exchange.validation';

const router = Router();

// Customer-facing: which delivered items can still be exchanged, my own
// requests, and creating/cancelling one.
router.get('/eligible', requireAuth, listEligibleItems);
router.get('/mine', requireAuth, listMyExchangeRequests);
router.post('/', requireAuth, exchangeUpload, validate(createExchangeRequestSchema), createExchangeRequest);
router.delete('/:id', requireAuth, cancelOwnExchangeRequest);

// Admin-facing moderation (no auth layer here yet, matching this backend's
// other admin endpoints like reviews/product/push CRUD).
router.get('/', listAllExchangeRequests);
router.patch('/:id/status', validate(updateExchangeStatusSchema), updateExchangeStatus);

export default router;
