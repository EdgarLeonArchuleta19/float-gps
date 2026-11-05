import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';
import { MaintenanceService } from '../services/maintenance.service';

const maintenance = new MaintenanceService();
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await maintenance.list(getTenant(req), req.query));
}));
router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await maintenance.create(req.body || {}, getTenant(req)));
}));
router.put('/:id', asyncHandler(async (req, res) => {
  res.json(await maintenance.update(req.params.id, req.body || {}, getTenant(req)));
}));
router.post('/:id/complete', asyncHandler(async (req, res) => {
  res.json(await maintenance.complete(req.params.id, req.body || {}, getTenant(req)));
}));
router.get('/:id/history', asyncHandler(async (req, res) => {
  res.json(await maintenance.history(req.params.id, getTenant(req)));
}));
router.patch('/:id/active', asyncHandler(async (req, res) => {
  res.json(await maintenance.setActive(req.params.id, req.body?.active, getTenant(req)));
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  res.json(await maintenance.remove(req.params.id, getTenant(req)));
}));

export default router;
