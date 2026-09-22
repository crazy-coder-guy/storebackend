import { Router } from 'express';
import {
  createProductVariant,
  deleteProductVariant,
  getProductVariant,
  listProductVariants,
  updateProductVariant,
} from '../controllers/productVariant.controller';
import { validate } from '../middleware/validate';
import {
  createProductVariantSchema,
  updateProductVariantSchema,
} from '../validation/productVariant.validation';

const router = Router({ mergeParams: true });

router.get('/', listProductVariants);
router.get('/:variantId', getProductVariant);
router.post('/', validate(createProductVariantSchema), createProductVariant);
router.patch('/:variantId', validate(updateProductVariantSchema), updateProductVariant);
router.delete('/:variantId', deleteProductVariant);

export default router;
