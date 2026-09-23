import { Router } from 'express';
import { getTopSearches, searchProducts } from '../controllers/search.controller';

const router = Router();

router.get('/top', getTopSearches);
router.get('/', searchProducts);

export default router;
