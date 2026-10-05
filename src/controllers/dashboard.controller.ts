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
