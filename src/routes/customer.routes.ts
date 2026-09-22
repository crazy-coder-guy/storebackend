import { Router } from 'express';
import { getCustomer, listCustomers } from '../controllers/customer.controller';

const router = Router();

router.get('/', listCustomers);
router.get('/:id', getCustomer);

export default router;
