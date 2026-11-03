import { Request, Response } from 'express';
import { OwnerService } from '../services/owner.service';
import { asyncHandler } from '../middleware/errorHandler';
import { listAudit } from '../services/audit.service';

const ownerService = new OwnerService();

export const getOwnerOverview = asyncHandler(async (_req: Request, res: Response) => {
  const result = await ownerService.getOverview();
  res.json(result);
});

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.createCompany(req.body || {});
  res.status(201).json(result);
});

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.updateCompany(req.params.id, req.body || {});
  res.json(result);
});

export const toggleCompanyStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.toggleCompanyStatus(req.params.id);
  res.json(result);
});

export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.deleteCompany(req.params.id);
  res.json(result);
});

export const listAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const result = await ownerService.listAllUsers();
  res.json(result);
});

export const createCompanyUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.createCompanyUser(req.body || {});
  res.status(201).json(result);
});

export const resetUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.resetUserPassword(req.params.id, req.body?.newPassword);
  res.json(result);
});

export const deleteOwnerUser = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.deleteUser(req.params.id);
  res.json(result);
});

export const listAllGps = asyncHandler(async (_req: Request, res: Response) => {
  const result = await ownerService.listAllGps();
  res.json(result);
});

export const createOwnerGps = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.createGps(req.body || {});
  res.status(201).json(result);
});

export const updateOwnerGps = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.updateGps(req.params.id, req.body || {});
  res.json(result);
});

export const deleteOwnerGps = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.deleteGps(req.params.id);
  res.json(result);
});

export const startSupportSession = asyncHandler(async (req: Request, res: Response) => {
  const result = await ownerService.getCompanyForSupport(req.params.id);
  res.json(result);
});

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit || '100'), 10) || 100;
  const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
  const result = await listAudit(limit, action);
  res.json(result);
});
