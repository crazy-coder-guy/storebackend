import { Router } from 'express';
import { getDashboardSummary, getProfitabilitySummary } from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/profitability', getProfitabilitySummary);

export default router;
