import { Router } from 'express';
import { createSize, deleteSize, listSizes, updateSize } from '../controllers/size.controller';
import { validate } from '../middleware/validate';
import { createSizeSchema, updateSizeSchema } from '../validation/size.validation';

const router = Router();

router.get('/', listSizes);
router.post('/', validate(createSizeSchema), createSize);
router.patch('/:id', validate(updateSizeSchema), updateSize);
router.delete('/:id', deleteSize);

export default router;
