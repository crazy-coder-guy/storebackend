import { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const threshold = req.query.threshold ? parseInt(String(req.query.threshold), 10) : 10;
  const summary = await dashboardService.getDashboardSummary(
    Number.isFinite(threshold) ? threshold : 10
  );
  return sendSuccess(res, summary, 'Dashboard summary fetched');
});

export const getProfitabilitySummary = asyncHandler(async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  const summary = await dashboardService.getProfitabilitySummary({
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  });
  return sendSuccess(res, summary, 'Profitability summary fetched');
});

const ALLOWED_RANGES = new Set([7, 15, 30]);

export const getProfitabilityTimeseries = asyncHandler(async (req: Request, res: Response) => {
  const requested = parseInt(String(req.query.days ?? '7'), 10);
  const days = ALLOWED_RANGES.has(requested) ? requested : 7;
  const series = await dashboardService.getProfitabilityTimeseries(days);
  return sendSuccess(res, { days, series }, 'Profitability timeseries fetched');
});

function resolveDays(req: Request): number {
  const requested = parseInt(String(req.query.days ?? '7'), 10);
  return ALLOWED_RANGES.has(requested) ? requested : 7;
}

export const getTopProducts = asyncHandler(async (req: Request, res: Response) => {
  const days = resolveDays(req);
  const requestedLimit = parseInt(String(req.query.limit ?? '5'), 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 10) : 5;
  const products = await dashboardService.getTopProducts(days, limit);
  return sendSuccess(res, { days, products }, 'Top products fetched');
});

export const getCategoryPerformance = asyncHandler(async (req: Request, res: Response) => {
  const days = resolveDays(req);
  const categories = await dashboardService.getCategoryPerformance(days);
  return sendSuccess(res, { days, categories }, 'Category performance fetched');
});

export const getOrderStatusBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const days = resolveDays(req);
  const breakdown = await dashboardService.getOrderStatusBreakdown(days);
  return sendSuccess(res, { days, ...breakdown }, 'Order status breakdown fetched');
});
