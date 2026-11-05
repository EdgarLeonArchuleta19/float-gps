import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { adminRequired, getTenant } from '../middleware/auth';
import { GroupService } from '../services/group.service';

const groups = new GroupService();
const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await groups.list(getTenant(req)));
}));
router.post('/', adminRequired, asyncHandler(async (req, res) => {
  res.status(201).json(await groups.create(req.body || {}, getTenant(req)));
}));
router.put('/:id', adminRequired, asyncHandler(async (req, res) => {
  res.json(await groups.update(req.params.id, req.body || {}, getTenant(req)));
}));
router.patch('/:id/active', adminRequired, asyncHandler(async (req, res) => {
  res.json(await groups.setActive(req.params.id, req.body?.active, getTenant(req)));
}));
router.delete('/:id', adminRequired, asyncHandler(async (req, res) => {
  res.json(await groups.remove(req.params.id, getTenant(req)));
}));

export default router;
