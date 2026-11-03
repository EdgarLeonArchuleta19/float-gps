import { Router } from 'express';
import {
  getOwnerOverview,
  createCompany,
  updateCompany,
  toggleCompanyStatus,
  deleteCompany,
  listAllUsers,
  createCompanyUser,
  resetUserPassword,
  deleteOwnerUser,
  listAllGps,
  createOwnerGps,
  updateOwnerGps,
  deleteOwnerGps,
  startSupportSession,
  getAuditLogs,
} from '../controllers/owner.controller';
import { ownerLogoutAll } from '../controllers/auth.controller';
import { masterKeyRequired } from '../middleware/auth';
import { auditOwnerAction } from '../middleware/audit';

const router = Router();

router.get('/overview', getOwnerOverview);
router.get('/audit-logs', getAuditLogs);
router.post('/sessions/revoke-all', auditOwnerAction('OWNER_REVOKE_ALL_REQUEST'), ownerLogoutAll);

router.post('/companies', auditOwnerAction('COMPANY_CREATE', 'company'), createCompany);
router.patch('/companies/:id', auditOwnerAction('COMPANY_UPDATE', 'company'), updateCompany);
router.post('/companies/:id/toggle-status', auditOwnerAction('COMPANY_TOGGLE_STATUS', 'company'), toggleCompanyStatus);
router.post('/companies/:id/support-session', auditOwnerAction('SUPPORT_MODE_ENTER', 'company'), startSupportSession);
router.delete(
  '/companies/:id',
  masterKeyRequired('COMPANY_DELETE'),
  auditOwnerAction('COMPANY_DELETE', 'company'),
  deleteCompany,
);

router.get('/users', listAllUsers);
router.post('/users', auditOwnerAction('USER_CREATE', 'user'), createCompanyUser);
router.post(
  '/users/:id/reset-password',
  masterKeyRequired('USER_RESET_PASSWORD'),
  auditOwnerAction('USER_RESET_PASSWORD', 'user'),
  resetUserPassword,
);
router.delete(
  '/users/:id',
  masterKeyRequired('USER_DELETE'),
  auditOwnerAction('USER_DELETE', 'user'),
  deleteOwnerUser,
);

router.get('/gps', listAllGps);
router.post('/gps', auditOwnerAction('GPS_CREATE', 'gps'), createOwnerGps);
router.patch('/gps/:id', auditOwnerAction('GPS_UPDATE', 'gps'), updateOwnerGps);
router.delete('/gps/:id', masterKeyRequired('GPS_DELETE'), auditOwnerAction('GPS_DELETE', 'gps'), deleteOwnerGps);

export default router;
