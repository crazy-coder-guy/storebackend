import { Router } from 'express';
import { createColor, deleteColor, listColors, updateColor } from '../controllers/color.controller';
import { validate } from '../middleware/validate';
import { createColorSchema, updateColorSchema } from '../validation/color.validation';

const router = Router();

router.get('/', listColors);
router.post('/', validate(createColorSchema), createColor);
router.patch('/:id', validate(updateColorSchema), updateColor);
router.delete('/:id', deleteColor);

export default router;
