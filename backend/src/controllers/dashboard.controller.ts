import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';

const dashboardService = new DashboardService();

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const stats = await dashboardService.getStats(getTenant(req));
  res.json(stats);
});
