import { Router } from 'express';
import { recordVisit } from '../controllers/visit.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuth, recordVisit);

export default router;
