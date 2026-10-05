import { Router } from 'express';
import {
  getDashboardSummary,
  getProfitabilitySummary,
  getProfitabilityTimeseries,
  getTopProducts,
  getCategoryPerformance,
  getOrderStatusBreakdown,
} from '../controllers/dashboard.controller';

const router = Router();

router.get('/summary', getDashboardSummary);
router.get('/profitability', getProfitabilitySummary);
router.get('/profitability/timeseries', getProfitabilityTimeseries);
router.get('/top-products', getTopProducts);
router.get('/category-performance', getCategoryPerformance);
router.get('/order-status', getOrderStatusBreakdown);

export default router;
