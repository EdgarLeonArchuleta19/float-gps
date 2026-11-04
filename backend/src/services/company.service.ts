import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { TenantContext } from '../middleware/auth';
import { DEFAULT_SCHEDULE, parseSchedule, WorkSchedule } from '../utils/workSchedule';

const prisma = new PrismaClient();

const PROFILE_SELECT = {
  name: true,
  legalName: true,
  taxId: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  website: true,
  logo: true,
} as const;

const TEXT_LIMITS = {
  legalName: 120,
  taxId: 20,
  contactPhone: 30,
  address: 250,
  website: 120,
} as const;

const MAX_LOGO_LENGTH = 700_000;
const LOGO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CompanyProfile {
  name: string;
  legalName: string | null;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  website: string | null;
  logo: string | null;
}

function optionalText(value: unknown, max: number, label: string): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (text.length > max) throw new AppError(`${label} admite máximo ${max} caracteres`, 400);
  return text || null;
}

export class CompanyService {
  async getProfile(tenant?: TenantContext): Promise<CompanyProfile> {
    if (!tenant?.companyId) throw new AppError('Tu cuenta no pertenece a una empresa', 400);
    const company = await prisma.company.findUnique({ where: { id: tenant.companyId }, select: PROFILE_SELECT });
    if (!company) throw new AppError('Empresa no encontrada', 404);
    return company;
  }

  async updateProfile(data: Record<string, unknown>, tenant?: TenantContext): Promise<CompanyProfile> {
    if (!tenant?.companyId) throw new AppError('Tu cuenta no pertenece a una empresa', 400);
    const name = String(data.name ?? '').trim();
    if (name.length < 2 || name.length > 80) throw new AppError('El nombre de la empresa debe tener entre 2 y 80 caracteres', 400);
    const contactEmail = optionalText(data.contactEmail, 120, 'El correo');
    if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) throw new AppError('El correo de contacto no es válido', 400);
    const logo = data.logo ? String(data.logo) : null;
    if (logo && (logo.length > MAX_LOGO_LENGTH || !LOGO_PATTERN.test(logo))) {
      throw new AppError('El logo debe ser una imagen PNG, JPG o WEBP de máximo 500 KB', 400);
    }
    return prisma.company.update({
      where: { id: tenant.companyId },
      data: {
        name,
        contactEmail,
        logo,
        legalName: optionalText(data.legalName, TEXT_LIMITS.legalName, 'La razón social'),
        taxId: optionalText(data.taxId, TEXT_LIMITS.taxId, 'El RFC')?.toUpperCase() ?? null,
        contactPhone: optionalText(data.contactPhone, TEXT_LIMITS.contactPhone, 'El teléfono'),
        address: optionalText(data.address, TEXT_LIMITS.address, 'La dirección'),
        website: optionalText(data.website, TEXT_LIMITS.website, 'El sitio web'),
      },
      select: PROFILE_SELECT,
    });
  }


  async getSchedule(tenant?: TenantContext): Promise<WorkSchedule> {
    if (!tenant?.companyId) return DEFAULT_SCHEDULE;
    const company = await prisma.company.findUnique({
      where: { id: tenant.companyId },
      select: { workStartHour: true, workEndHour: true, workDays: true },
    });
    return parseSchedule(company);
  }

  async updateSchedule(data: { startHour?: unknown; endHour?: unknown; days?: unknown }, tenant?: TenantContext): Promise<WorkSchedule> {
    if (!tenant?.companyId) throw new AppError('Tu cuenta no pertenece a una empresa', 400);
    const startHour = Number(data.startHour);
    const endHour = Number(data.endHour);
    const days = Array.isArray(data.days) ? [...new Set(data.days.map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [];
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour) || startHour < 0 || endHour > 24 || startHour >= endHour) {
      throw new AppError('El horario no es válido: la hora de inicio debe ser menor a la de fin', 400);
    }
    if (!days.length) throw new AppError('Selecciona al menos un día laboral', 400);
    const company = await prisma.company.update({
      where: { id: tenant.companyId },
      data: { workStartHour: startHour, workEndHour: endHour, workDays: days.sort().join(',') },
      select: { workStartHour: true, workEndHour: true, workDays: true },
    });
    return parseSchedule(company);
  }
}
