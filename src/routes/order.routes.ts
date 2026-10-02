import { Router } from 'express';
import {
  cancelMyOrder,
  createOrder,
  getMyOrders,
  getOrder,
  listOrders,
  trackOrder,
  updateOrderStatus,
} from '../controllers/order.controller';
import { createRazorpayOrder, reconcilePayment, verifyPayment } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, updateOrderStatusSchema } from '../validation/order.validation';
import { verifyPaymentSchema } from '../validation/payment.validation';

const router = Router();

router.get('/', listOrders);
router.get('/mine', requireAuth, getMyOrders);
router.get('/track', trackOrder);
router.get('/:id', getOrder);
router.post('/', requireAuth, validate(createOrderSchema), createOrder);
router.post('/:id/cancel', requireAuth, cancelMyOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/:id/razorpay-order', createRazorpayOrder);
router.post('/:id/razorpay-verify', validate(verifyPaymentSchema), verifyPayment);
router.post('/:id/razorpay-sync', requireAuth, reconcilePayment);

export default router;
