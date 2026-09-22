import { Router } from 'express';
import {
  createProductImage,
  deleteProductImage,
  listProductImages,
  updateProductImage,
} from '../controllers/productImage.controller';
import { validate } from '../middleware/validate';
import {
  createProductImageSchema,
  updateProductImageSchema,
} from '../validation/productImage.validation';

const router = Router({ mergeParams: true });

router.get('/', listProductImages);
router.post('/', validate(createProductImageSchema), createProductImage);
router.patch('/:imageId', validate(updateProductImageSchema), updateProductImage);
router.delete('/:imageId', deleteProductImage);

export default router;
