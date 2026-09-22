import { Router } from 'express';
import {
  createProductImage,
  deleteProductImage,
  listProductImages,
  updateProductImage,
  uploadProductImage,
} from '../controllers/productImage.controller';
import { upload } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  createProductImageSchema,
  updateProductImageSchema,
  uploadProductImageSchema,
} from '../validation/productImage.validation';

const router = Router({ mergeParams: true });

router.get('/', listProductImages);
router.post('/', validate(createProductImageSchema), createProductImage);
router.post('/upload', upload.single('image'), validate(uploadProductImageSchema), uploadProductImage);
router.patch('/:imageId', validate(updateProductImageSchema), updateProductImage);
router.delete('/:imageId', deleteProductImage);

export default router;
