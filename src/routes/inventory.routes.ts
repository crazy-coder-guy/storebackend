import { Router } from 'express';
import {
  adjustStock,
  getLowStock,
  getOutOfStock,
  getVariantHistory,
  listInventory,
} from '../controllers/inventory.controller';
import { validate } from '../middleware/validate';
import { adjustStockSchema } from '../validation/inventory.validation';

const router = Router();

router.get('/', listInventory);
router.get('/low-stock', getLowStock);
router.get('/out-of-stock', getOutOfStock);
router.get('/:variantId/history', getVariantHistory);
router.patch('/:variantId', validate(adjustStockSchema), adjustStock);

export default router;
