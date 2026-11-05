import { Router, Request } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getStaff, staffCan, staffOwnerRequired, staffRequired, stepUpRequired } from '../middleware/staffAuth';
import { auditStaffAction } from '../middleware/audit';
import { getClientIp, listAudit } from '../services/audit.service';
import { StaffAuthService, publicStaff } from '../services/staffAuth.service';
import { ConsoleService } from '../services/console.service';
import { TeamService } from '../services/team.service';
import { SupportSessionService } from '../services/supportSession.service';
import { SubscriptionService } from '../services/subscription.service';
import { TrashService } from '../services/trash.service';
import { CustomerService } from '../services/customer.service';

const auth = new StaffAuthService();
const consoleService = new ConsoleService();
const team = new TeamService();
const support = new SupportSessionService();
const subscriptions = new SubscriptionService();
const trash = new TrashService();
const customers = new CustomerService();

const context = (req: Request) => ({ ip: getClientIp(req), userAgent: req.headers['user-agent'] || null });

const router = Router();

router.post('/auth/login', asyncHandler(async (req, res) => {
  res.json(await auth.login(req.body?.email, req.body?.password, context(req)));
}));
router.use(staffRequired);

router.get('/me', (req, res) => {
  res.json(publicStaff(getStaff(req)));
});
router.post('/me/password', auditStaffAction('STAFF_PASSWORD_CHANGE_REQUEST'), asyncHandler(async (req, res) => {
  res.json(await auth.changePassword(getStaff(req), req.body?.currentPassword, req.body?.newPassword, context(req)));
}));
router.post('/me/logout-all', stepUpRequired('STAFF_REVOKE_ALL'), asyncHandler(async (req, res) => {
  res.json(await auth.logoutAll(getStaff(req), context(req)));
}));

router.get('/overview', staffCan('companies'), asyncHandler(async (_req, res) => {
  res.json(await consoleService.getOverview());
}));
router.post('/companies', staffCan('billing'), auditStaffAction('COMPANY_CREATE', 'company'), asyncHandler(async (req, res) => {
  res.status(201).json(await consoleService.createCompany(req.body || {}));
}));
router.get('/companies/:id', staffCan('companies'), asyncHandler(async (req, res) => {
  res.json(await customers.get(req.params.id));
}));
router.patch('/companies/:id', staffCan('billing'), auditStaffAction('COMPANY_UPDATE', 'company'), asyncHandler(async (req, res) => {
  res.json(await customers.update(req.params.id, req.body || {}));
}));
router.post('/companies/:id/plan', staffCan('billing'), stepUpRequired('COMPANY_PLAN_CHANGE'), asyncHandler(async (req, res) => {
  res.json(await customers.changePlan(req.params.id, req.body || {}, { staff: getStaff(req), ...context(req) }));
}));
router.get('/companies/:id/history', staffCan('companies'), asyncHandler(async (req, res) => {
  res.json(await customers.history(req.params.id));
}));
router.get('/companies/:id/units', staffCan('gps'), asyncHandler(async (req, res) => {
  res.json(await customers.units(req.params.id));
}));
router.post('/companies/:id/toggle-status', staffCan('billing'), stepUpRequired('COMPANY_TOGGLE_STATUS'), auditStaffAction('COMPANY_TOGGLE_STATUS', 'company'), asyncHandler(async (req, res) => {
  res.json(await consoleService.toggleCompanyStatus(req.params.id));
}));
router.delete('/companies/:id', staffOwnerRequired, stepUpRequired('COMPANY_DELETE'), auditStaffAction('COMPANY_DELETE', 'company'), asyncHandler(async (req, res) => {
  res.json(await consoleService.deleteCompany(req.params.id));
}));

router.post('/companies/:id/support-sessions', staffCan('support'), auditStaffAction('SUPPORT_MODE_ENTER', 'company'), asyncHandler(async (req, res) => {
  res.status(201).json(await support.start(getStaff(req), req.params.id, req.body?.reason, getClientIp(req)));
}));
router.post('/support-sessions/:id/end', staffCan('support'), asyncHandler(async (req, res) => {
  res.json(await support.end(getStaff(req), req.params.id));
}));
router.get('/support-sessions', staffCan('audit'), asyncHandler(async (req, res) => {
  res.json(await support.recent(parseInt(String(req.query.limit || '100'), 10) || 100));
}));

router.get('/subscriptions', staffCan('billing'), asyncHandler(async (_req, res) => {
  res.json(await subscriptions.list());
}));
router.put('/subscriptions/:id', staffCan('billing'), stepUpRequired('SUBSCRIPTION_SAVE'), auditStaffAction('SUBSCRIPTION_SAVE', 'company'), asyncHandler(async (req, res) => {
  res.json(await subscriptions.save(req.params.id, req.body || {}));
}));

router.get('/users', staffCan('customers'), asyncHandler(async (_req, res) => {
  res.json(await consoleService.listAllUsers());
}));
router.post('/users', staffCan('customers'), auditStaffAction('USER_CREATE', 'user'), asyncHandler(async (req, res) => {
  res.status(201).json(await consoleService.createCompanyUser(req.body || {}));
}));
router.post('/users/:id/reset-password', staffCan('customers'), stepUpRequired('USER_RESET_PASSWORD'), auditStaffAction('USER_RESET_PASSWORD', 'user'), asyncHandler(async (req, res) => {
  res.json(await consoleService.resetUserPassword(req.params.id, req.body?.newPassword));
}));
router.delete('/users/:id', staffCan('customers'), stepUpRequired('USER_DELETE'), auditStaffAction('USER_DELETE', 'user'), asyncHandler(async (req, res) => {
  res.json(await consoleService.deleteUser(req.params.id));
}));

router.get('/gps', staffCan('gps'), asyncHandler(async (_req, res) => {
  res.json(await consoleService.listAllGps());
}));
router.post('/gps', staffCan('gps'), auditStaffAction('GPS_CREATE', 'gps'), asyncHandler(async (req, res) => {
  res.status(201).json(await consoleService.createGps(req.body || {}));
}));
router.patch('/gps/:id', staffCan('gps'), stepUpRequired('GPS_UPDATE'), auditStaffAction('GPS_UPDATE', 'gps'), asyncHandler(async (req, res) => {
  res.json(await consoleService.updateGps(req.params.id, req.body || {}));
}));
router.post('/gps/:id/link', staffCan('gps'), stepUpRequired('GPS_LINK'), auditStaffAction('GPS_LINK', 'gps'), asyncHandler(async (req, res) => {
  const result = await customers.linkGps(req.params.id, req.body || {});
  res.locals.auditCompanyId = result.companyId;
  res.json(result);
}));
router.post('/gps/:id/unlink', staffCan('gps'), stepUpRequired('GPS_UNLINK'), auditStaffAction('GPS_UNLINK', 'gps'), asyncHandler(async (req, res) => {
  const result = await customers.unlinkGps(req.params.id);
  res.locals.auditCompanyId = result.companyId;
  res.json(result);
}));
router.delete('/gps/:id', staffCan('gps'), stepUpRequired('GPS_DELETE'), auditStaffAction('GPS_DELETE', 'gps'), asyncHandler(async (req, res) => {
  res.json(await consoleService.deleteGps(req.params.id));
}));

router.get('/trash', staffCan('trash'), asyncHandler(async (_req, res) => {
  res.json(await trash.list());
}));
router.post('/trash/:type/:id/restore', staffCan('trash'), auditStaffAction('RECORD_RESTORE', 'record'), asyncHandler(async (req, res) => {
  res.json(await trash.restore(req.params.type, req.params.id));
}));

router.get('/audit-logs', staffCan('audit'), asyncHandler(async (req, res) => {
  const limit = parseInt(String(req.query.limit || '100'), 10) || 100;
  const action = typeof req.query.action === 'string' && req.query.action ? req.query.action : undefined;
  res.json(await listAudit(limit, action));
}));

router.get('/team', staffCan('team'), asyncHandler(async (_req, res) => {
  res.json(await team.list());
}));
router.post('/team', staffCan('team'), stepUpRequired('TEAM_CREATE'), auditStaffAction('TEAM_CREATE', 'staff'), asyncHandler(async (req, res) => {
  res.status(201).json(await team.create(req.body || {}));
}));
router.patch('/team/:id', staffCan('team'), stepUpRequired('TEAM_UPDATE'), auditStaffAction('TEAM_UPDATE', 'staff'), asyncHandler(async (req, res) => {
  res.json(await team.update(req.params.id, req.body || {}, getStaff(req)));
}));
router.patch('/team/:id/active', staffCan('team'), stepUpRequired('TEAM_SET_ACTIVE'), auditStaffAction('TEAM_SET_ACTIVE', 'staff'), asyncHandler(async (req, res) => {
  res.json(await team.setActive(req.params.id, req.body?.active, getStaff(req)));
}));
router.post('/team/:id/reset-password', staffCan('team'), stepUpRequired('TEAM_RESET_PASSWORD'), auditStaffAction('TEAM_RESET_PASSWORD', 'staff'), asyncHandler(async (req, res) => {
  res.json(await team.resetPassword(req.params.id, getStaff(req)));
}));

export default router;
