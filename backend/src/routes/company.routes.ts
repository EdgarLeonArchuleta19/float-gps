import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { adminRequired, getTenant } from '../middleware/auth';
import { CompanyService } from '../services/company.service';

const companyService = new CompanyService();
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
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await companyService.updateSchedule(req.body || {}, getTenant(req)));
  })
);

export default router;
