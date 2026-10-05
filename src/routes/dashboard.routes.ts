import { Router } from 'express';
import {
  getDashboardSummary,
  getProfitabilitySummary,
  getProfitabilityTimeseries,
} from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/profitability', getProfitabilitySummary);
router.get('/profitability/timeseries', getProfitabilityTimeseries);

export default router;
