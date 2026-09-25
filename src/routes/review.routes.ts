import { Router } from 'express';
import { createReview, deleteOwnReview, listProductReviews } from '../controllers/review.controller';
import { requireAuth } from '../middleware/auth';
import { reviewUpload } from '../middleware/reviewUpload';
import { validate } from '../middleware/validate';
import { createReviewSchema } from '../validation/review.validation';

const router = Router({ mergeParams: true });

router.get('/', listProductReviews);
router.post('/', requireAuth, reviewUpload, validate(createReviewSchema), createReview);
router.delete('/:reviewId', requireAuth, deleteOwnReview);

export default router;
