import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function ensureOwnerAndDefaultCompany() {
  try {
    let defaultCompany = await prisma.company.findUnique({
      where: { slug: 'floa-matriz' },
    });

    if (!defaultCompany) {
      defaultCompany = await prisma.company.create({
        data: {
          name: 'FLOA Operaciones Matriz',
          slug: 'floa-matriz',
          contactEmail: 'admin@floagps.com',
          contactPhone: '+52 667 100 0000',
          plan: 'ENTERPRISE',
          maxUnits: 100,
          isActive: true,
          notes: 'Empresa principal por defecto',
        },
      });
    }

    await Promise.all([
      prisma.vehicle.updateMany({
        where: { companyId: null },
        data: { companyId: defaultCompany.id },
      }),
      prisma.machine.updateMany({
        where: { companyId: null },
        data: { companyId: defaultCompany.id },
      }),
      prisma.geofence.updateMany({
        where: { companyId: null },
        data: { companyId: defaultCompany.id },
      }),
      prisma.gpsDevice.updateMany({
        where: { companyId: null },
        data: { companyId: defaultCompany.id },
      }),
      prisma.user.updateMany({
        where: { companyId: null, role: { not: 'superadmin' } },
        data: { companyId: defaultCompany.id },
      }),
    ]);

    const ownerEmail = (process.env.OWNER_EMAIL || 'owner@floagps.com').trim().toLowerCase();
    const isProduction = process.env.NODE_ENV === 'production';
    const ownerPass = process.env.OWNER_PASSWORD || (isProduction ? '' : 'FloaOwner2026!');
    const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });

    if (!existingOwner && (!ownerPass || ownerPass.length < 12)) {
      console.warn('[OWNER] OWNER_PASSWORD no configurada o menor a 12 caracteres. No se creó la cuenta de dueño.');
    } else if (!existingOwner) {
      const hash = await bcrypt.hash(ownerPass, 10);
      await prisma.user.create({
        data: {
          email: ownerEmail,
          name: 'Dueño FLOA (Master)',
          password: hash,
          role: 'superadmin',
          companyId: null,
        },
      });
      console.log(`[OWNER] Cuenta SuperAdmin creada: ${ownerEmail}`);
    } else if (existingOwner.role !== 'superadmin') {
      await prisma.user.update({
        where: { id: existingOwner.id },
        data: { role: 'superadmin' },
      });
    }
  } catch (err) {
    console.error('[OWNER] Error inicializando cuenta maestra:', err);
  }
}
