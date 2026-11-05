import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { normalizePlan } from '../utils/plans';

const prisma = new PrismaClient();

export const SUBSCRIPTION_STATUSES = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED'] as const;
const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;
const BLOCKING = ['SUSPENDED', 'CANCELLED'];
const BILLABLE = ['ACTIVE', 'PAST_DUE'];
const MAX_PRICE = 100000;
const MAX_UNITS = 10000;

function pick<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  throw new AppError(`${label} no es válido`, 400);
}

function monthlyAmount(sub: { status: string; billingCycle: string; pricePerUnit: number } | null, units: number) {
  if (!sub || !BILLABLE.includes(sub.status)) return 0;
  const perMonth = sub.billingCycle === 'YEARLY' ? sub.pricePerUnit / 12 : sub.pricePerUnit;
  return Math.round(perMonth * units * 100) / 100;
}

export class SubscriptionService {
  async list() {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        plan: true,
        maxUnits: true,
        isActive: true,
        subscription: true,
        _count: { select: { vehicles: { where: { deletedAt: null } }, machines: { where: { deletedAt: null } } } },
      },
    });
    const rows = companies.map((c) => ({
      company: { id: c.id, name: c.name, plan: normalizePlan(c.plan), maxUnits: c.maxUnits, isActive: c.isActive },
      units: c._count.vehicles + c._count.machines,
      subscription: c.subscription,
      monthlyAmount: monthlyAmount(c.subscription, c.maxUnits),
    }));
    const now = Date.now();
    return {
      rows,
      metrics: {
        monthlyRevenue: Math.round(rows.reduce((sum, r) => sum + r.monthlyAmount, 0) * 100) / 100,
        active: rows.filter((r) => r.subscription?.status === 'ACTIVE').length,
        trial: rows.filter((r) => r.subscription?.status === 'TRIAL').length,
        pastDue: rows.filter((r) => r.subscription?.status === 'PAST_DUE').length,
        dueSoon: rows.filter((r) => r.subscription?.nextBillingAt && r.subscription.nextBillingAt.getTime() - now < 7 * 86400000).length,
        withoutSubscription: rows.filter((r) => !r.subscription).length,
      },
    };
  }

  // Saves the contracted units and billing data of one company (the plan is
  // changed apart, with a reason).
  // Moving to Suspended or Cancelled also suspends the company's access, and
  // moving back to Active or Trial restores it.
  async save(companyId: string, data: Record<string, unknown>) {
    const company = await prisma.company.findUnique({ where: { id: companyId }, include: { subscription: true } });
    if (!company || company.deletedAt) throw new AppError('Empresa no encontrada', 404);

    const status = pick(data.status, SUBSCRIPTION_STATUSES, 'El estado');
    const billingCycle = pick(data.billingCycle, BILLING_CYCLES, 'El ciclo de cobro');
    const pricePerUnit = Number(data.pricePerUnit);
    if (!Number.isFinite(pricePerUnit) || pricePerUnit < 0 || pricePerUnit > MAX_PRICE) throw new AppError('El precio por unidad no es válido', 400);
    const maxUnits = Number(data.maxUnits);
    if (!Number.isInteger(maxUnits) || maxUnits < 1 || maxUnits > MAX_UNITS) throw new AppError('Las unidades contratadas deben ser un número entre 1 y 10,000', 400);
    let nextBillingAt: Date | null = null;
    if (data.nextBillingAt) {
      nextBillingAt = new Date(String(data.nextBillingAt));
      if (Number.isNaN(nextBillingAt.getTime())) throw new AppError('La fecha de próximo cobro no es válida', 400);
    }
    const notes = data.notes ? String(data.notes).trim().slice(0, 500) : null;

    const previous = company.subscription?.status;
    const accessChange =
      previous !== status && BLOCKING.includes(status) ? { isActive: false } : previous !== status && previous && BLOCKING.includes(previous) ? { isActive: true } : {};

    const fields = { status, billingCycle, pricePerUnit, nextBillingAt, notes };
    const [, subscription] = await prisma.$transaction([
      prisma.company.update({ where: { id: companyId }, data: { maxUnits, ...accessChange } }),
      prisma.subscription.upsert({
        where: { companyId },
        create: { companyId, ...fields },
        update: fields,
      }),
    ]);
    return subscription;
  }
}
