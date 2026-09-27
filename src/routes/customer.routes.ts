import { Router } from 'express';
import { getCustomer, getCustomerCart, listCustomers } from '../controllers/customer.controller';

const router = Router();

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.get('/:id/cart', getCustomerCart);

export default router;
