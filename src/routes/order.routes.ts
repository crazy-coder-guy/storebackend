import { Router } from 'express';
import { createOrder, getOrder, listOrders, updateOrderStatus } from '../controllers/order.controller';
import { validate } from '../middleware/validate';
import { createOrderSchema, updateOrderStatusSchema } from '../validation/order.validation';

const router = Router();

router.get('/', listOrders);
router.get('/:id', getOrder);
router.post('/', validate(createOrderSchema), createOrder);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);

export default router;
