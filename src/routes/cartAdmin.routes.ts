import { Router } from 'express';
import { listAbandonedCarts } from '../controllers/cartAdmin.controller';

const router = Router();

// Admin-facing moderation (no auth layer here yet, matching this backend's
// other admin endpoints like reviews/exchanges/product CRUD).
router.get('/', listAbandonedCarts);

export default router;
