import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function ensureDefaultCompany() {
  let defaultCompany = await prisma.company.findUnique({ where: { slug: 'floa-matriz' } });
  if (!defaultCompany) {
    defaultCompany = await prisma.company.create({
      data: {
        name: 'FLOA Operaciones Matriz',
        slug: 'floa-matriz',
        contactEmail: 'admin@floagps.com',
        contactPhone: '+52 667 100 0000',
        plan: 'EMPRESA',
        maxUnits: 100,
        isActive: true,
        notes: 'Empresa principal por defecto',
      },
    });
  }
  const companyId = defaultCompany.id;
  await Promise.all([
    prisma.vehicle.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.machine.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.geofence.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.gpsDevice.updateMany({ where: { companyId: null }, data: { companyId } }),
    prisma.user.updateMany({ where: { companyId: null, role: { notIn: ['superadmin', 'retired'] } }, data: { companyId } }),
  ]);
}

// Console accounts used to live in the customer User table as "superadmin".
// They move to StaffUser as owners (same email, name and password) and the
// old row is retired: deleted, without a company and with an unusable password.
async function moveLegacyOwners() {
  const legacy = await prisma.user.findMany({ where: { role: 'superadmin' } });
  for (const user of legacy) {
    const exists = await prisma.staffUser.findUnique({ where: { email: user.email }, select: { id: true } });
    if (!exists) {
      await prisma.staffUser.create({ data: { email: user.email, name: user.name, password: user.password, role: 'owner' } });
      console.log(`[STAFF] ${user.email} pasó al equipo floaGPS como Dueño.`);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'retired',
        companyId: null,
        isActive: false,
        deletedAt: user.deletedAt || new Date(),
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        tokenVersion: { increment: 1 },
      },
    });
  }
}

// The very first owner of the console comes from OWNER_EMAIL and
// OWNER_PASSWORD; after that, owners add the rest of the team from the
// console itself.
async function ensureFirstOwner() {
  if ((await prisma.staffUser.count()) > 0) return;
  const email = (process.env.OWNER_EMAIL || 'owner@floagps.com').trim().toLowerCase();
  const isProduction = process.env.NODE_ENV === 'production';
  const password = process.env.OWNER_PASSWORD || (isProduction ? '' : 'FloaOwner2026!');
  if (password.length < 12) {
    console.warn('[STAFF] OWNER_PASSWORD no configurada o menor a 12 caracteres. No se creó el primer Dueño de la consola.');
    return;
  }
  await prisma.staffUser.create({
    data: { email, name: 'Dueño floaGPS', password: await bcrypt.hash(password, 10), role: 'owner' },
  });
  console.log(`[STAFF] Primer Dueño de la consola creado: ${email}`);
}

export async function bootstrap() {
  try {
    await ensureDefaultCompany();
    await moveLegacyOwners();
    await ensureFirstOwner();
  } catch (err) {
    console.error('[BOOTSTRAP] Error preparando la base de datos:', err);
  }
}
