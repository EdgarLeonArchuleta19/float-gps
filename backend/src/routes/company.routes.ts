import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { adminRequired, getTenant, planRequired } from '../middleware/auth';
import { CompanyService } from '../services/company.service';
import { SupportSessionService } from '../services/supportSession.service';

const companyService = new CompanyService();
const supportSessions = new SupportSessionService();
const router = Router();

router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await companyService.getProfile(getTenant(req)));
  })
);

router.put(
  '/profile',
  adminRequired,
  planRequired('EMPRESA'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await companyService.updateProfile(req.body || {}, getTenant(req)));
  })
);

router.get(
  '/schedule',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await companyService.getSchedule(getTenant(req)));
  })
);

router.put(
  '/schedule',
  adminRequired,
  planRequired('EMPRESA'),
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await companyService.updateSchedule(req.body || {}, getTenant(req)));
  })
);

router.get(
  '/support-access',
  adminRequired,
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await supportSessions.forCompany(getTenant(req).companyId || ''));
  })
);

export default router;
