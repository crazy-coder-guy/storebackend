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
