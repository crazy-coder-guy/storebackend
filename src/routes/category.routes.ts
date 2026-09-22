import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  deleteCategoryPermanently,
  getCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller';
import { validate } from '../middleware/validate';
import { createCategorySchema, updateCategorySchema } from '../validation/category.validation';

const router = Router();

router.get('/', listCategories);
router.get('/:id', getCategory);
router.post('/', validate(createCategorySchema), createCategory);
router.patch('/:id', validate(updateCategorySchema), updateCategory);
router.delete('/:id', deleteCategory);
router.delete('/:id/permanent', deleteCategoryPermanently);

export default router;
