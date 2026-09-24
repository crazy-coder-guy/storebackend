import { Router } from 'express';
import { createOrder, getMyOrders, getOrder, listOrders, updateOrderStatus } from '../controllers/order.controller';
import { createRazorpayOrder, verifyPayment } from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, updateOrderStatusSchema } from '../validation/order.validation';
import { verifyPaymentSchema } from '../validation/payment.validation';

const router = Router();

router.get('/', listOrders);
router.get('/mine', requireAuth, getMyOrders);
router.get('/:id', getOrder);
router.post('/', validate(createOrderSchema), createOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/:id/razorpay-order', createRazorpayOrder);
router.post('/:id/razorpay-verify', validate(verifyPaymentSchema), verifyPayment);

export default router;
