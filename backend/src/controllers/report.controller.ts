import { Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { asyncHandler } from '../middleware/errorHandler';

const reportService = new ReportService();

export const getDailyReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getDailyReport(req.query as any);
  res.json(report);
});

export const getWeeklyReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getWeeklyReport(req.query as any);
  res.json(report);
});

export const getMonthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getMonthlyReport(req.query as any);
  res.json(report);
});

export const getHoursReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getHoursReport(req.query as any);
  res.json(report);
});

export const getEventsReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getEventsReport(req.query as any);
  res.json(report);
});
