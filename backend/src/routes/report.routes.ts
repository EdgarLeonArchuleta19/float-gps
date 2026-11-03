import { Router } from 'express';
import { getDailyReport, getWeeklyReport, getMonthlyReport, getHoursReport, getEventsReport, getOffHoursReport } from '../controllers/report.controller';

const router = Router();
router.get('/daily', getDailyReport);
router.get('/weekly', getWeeklyReport);
router.get('/monthly', getMonthlyReport);
router.get('/hours', getHoursReport);
router.get('/events', getEventsReport);
router.get('/off-hours', getOffHoursReport);

export default router;
