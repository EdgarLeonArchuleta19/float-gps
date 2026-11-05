import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';
import { RoleService } from '../services/role.service';

const roleService = new RoleService();
const router = Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await roleService.findAll(getTenant(req)));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await roleService.findById(req.params.id, getTenant(req)));
  })
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await roleService.create(req.body || {}, getTenant(req)));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await roleService.update(req.params.id, req.body || {}, getTenant(req)));
  })
);

router.patch(
  '/:id/active',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await roleService.setActive(req.params.id, req.body?.active, getTenant(req)));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    res.json(await roleService.remove(req.params.id, getTenant(req)));
  })
);

export default router;
