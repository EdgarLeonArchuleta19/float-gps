import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../middleware/errorHandler';

const dashboardService = new DashboardService();

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const stats = await dashboardService.getStats();
  res.json(stats);
});
