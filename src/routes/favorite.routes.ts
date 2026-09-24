import { Router } from 'express';
import {
  addFavorite,
  clearFavorites,
  listFavorites,
  removeFavorite,
} from '../controllers/favorite.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', listFavorites);
router.post('/:productId', addFavorite);
router.delete('/:productId', removeFavorite);
router.delete('/', clearFavorites);

export default router;
