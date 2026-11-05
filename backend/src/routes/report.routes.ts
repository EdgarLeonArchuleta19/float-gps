import { Router } from 'express';
import { permissionRequired, planRequired } from '../middleware/auth';
import { getDailyReport, getWeeklyReport, getMonthlyReport, getHoursReport, getEventsReport, getOffHoursReport } from '../controllers/report.controller';

const reports = permissionRequired('reports');

const router = Router();
router.get('/daily', permissionRequired('reports', 'dashboard'), getDailyReport);
router.get('/weekly', reports, getWeeklyReport);
router.get('/monthly', reports, getMonthlyReport);
router.get('/hours', reports, getHoursReport);
router.get('/events', reports, getEventsReport);
router.get('/off-hours', planRequired('EMPRESA'), getOffHoursReport);

export default router;
