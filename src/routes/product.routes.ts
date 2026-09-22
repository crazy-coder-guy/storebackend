import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from '../controllers/product.controller';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema } from '../validation/product.validation';
import imageRoutes from './productImage.routes';
import variantRoutes from './productVariant.routes';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', validate(createProductSchema), createProduct);
router.patch('/:id', validate(updateProductSchema), updateProduct);
router.delete('/:id', deleteProduct);

router.use('/:productId/images', imageRoutes);
router.use('/:productId/variants', variantRoutes);

export default router;
