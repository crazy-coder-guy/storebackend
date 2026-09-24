import { Router } from 'express';
import {
  getFeaturedProducts,
  getSettings,
  setFeaturedProducts,
  updateSettings,
} from '../controllers/storefront.controller';
import { listStorefrontProducts } from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import {
  setFeaturedProductsSchema,
  updateStorefrontSettingsSchema,
} from '../validation/storefront.validation';

const router = Router();

router.get('/settings', getSettings);
router.patch('/settings', validate(updateStorefrontSettingsSchema), updateSettings);

router.get('/featured-products', getFeaturedProducts);
router.put('/featured-products', validate(setFeaturedProductsSchema), setFeaturedProducts);

router.get('/products', listStorefrontProducts);

export default router;
