import { Router } from 'express';
import {
  createCoupon,
  deleteCoupon,
  getCoupon,
  listCoupons,
  updateCoupon,
} from '../controllers/coupon.controller';
import { validate } from '../middleware/validate';
import { createCouponSchema, updateCouponSchema } from '../validation/coupon.validation';

const router = Router();

// Admin-facing CRUD — no auth layer here yet, matching this backend's other
// admin endpoints (products, sizes, colors, reviews, exchanges).
router.get('/', listCoupons);
router.get('/:id', getCoupon);
router.post('/', validate(createCouponSchema), createCoupon);
router.patch('/:id', validate(updateCouponSchema), updateCoupon);
router.delete('/:id', deleteCoupon);

export default router;
