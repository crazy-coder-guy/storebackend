import { Router } from 'express';
import { adminDeleteReview, listAllReviews, listReviewableOrders } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Customer-facing: which of my delivered products can I still review.
router.get('/reviewable', requireAuth, listReviewableOrders);

// Admin-facing moderation (no auth layer here yet, matching this backend's
// other admin endpoints like product/push CRUD).
router.get('/', listAllReviews);
router.delete('/:id', adminDeleteReview);

export default router;
