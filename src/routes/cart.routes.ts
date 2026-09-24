import { Router } from 'express';
import {
  addCartItem,
  clearCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from '../controllers/cart.controller';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addCartItemSchema, updateCartItemSchema } from '../validation/cart.validation';

const router = Router();

router.use(requireAuth);

router.get('/', getCart);
router.post('/items', validate(addCartItemSchema), addCartItem);
router.patch('/items/:itemId', validate(updateCartItemSchema), updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/', clearCart);

export default router;
