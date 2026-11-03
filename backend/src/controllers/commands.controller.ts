import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { getTenant } from '../middleware/auth';
import { engineCommandLimiter } from '../middleware/rateLimit';
import { getClientIp } from '../services/audit.service';

const prisma = new PrismaClient();

function requestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (!config.traccarToken && config.traccarUser) {
    const raw = `${config.traccarUser}:${config.traccarPassword}`;
    headers.Authorization = `Basic ${Buffer.from(raw).toString('base64')}`;
  }
  return headers;
}

// Optional second factor: clients that send `password` (the mobile app always does)
// get it verified here, so the double confirmation is enforced server-side.
// Wrong passwords answer 403, not 401, so the client does not log the user out.
async function confirmPasswordIfProvided(req: Request, userId: string): Promise<string | null> {
  const password = req.body?.password;
  if (password === undefined) return null;
  const keys = [`engine:user:${userId}`, `engine:ip:${getClientIp(req)}`];
  try {
    engineCommandLimiter.assertAllowed(keys, 'Demasiados intentos de confirmación.');
  } catch (err: any) {
    return err.message;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  const ok = !!user && typeof password === 'string' && (await bcrypt.compare(password, user.password).catch(() => false));
  if (!ok) {
    engineCommandLimiter.recordFailure(keys);
    return 'Contraseña de confirmación incorrecta';
  }
  engineCommandLimiter.clear(keys);
  return null;
}

export async function handleEngineCommand(req: Request, res: Response) {
  const { unitId, unitType, action = 'stop' } = req.body;
  const tenant = getTenant(req);

  if (tenant.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Tu cuenta de solo lectura no tiene permiso para enviar comandos de motor' });
  }

  const confirmError = await confirmPasswordIfProvided(req, tenant.userId);
  if (confirmError) {
    return res.status(403).json({ success: false, message: confirmError });
  }

  if (!unitId) {
    return res.status(400).json({ success: false, message: 'unitId es requerido' });
  }

  const isVehicle = (unitType || '').toLowerCase() === 'vehicle';
  let gpsDevice = null;

  if (isVehicle) {
    const v = await prisma.vehicle.findUnique({
      where: { id: unitId },
      include: { gpsDevice: true },
    });
    if (tenant.companyId && v?.companyId && v.companyId !== tenant.companyId) {
      return res.status(403).json({ success: false, message: 'No tienes autorización sobre esta unidad' });
    }
    gpsDevice = v?.gpsDevice;
  } else {
    const m = await prisma.machine.findUnique({
      where: { id: unitId },
      include: { gpsDevice: true },
    });
    if (tenant.companyId && m?.companyId && m.companyId !== tenant.companyId) {
      return res.status(403).json({ success: false, message: 'No tienes autorización sobre esta unidad' });
    }
    gpsDevice = m?.gpsDevice;
  }

  if (!gpsDevice) {
    return res.status(404).json({ success: false, message: 'La unidad no tiene un GPS vinculado' });
  }

  if (!config.traccarUrl) {
    return res.status(503).json({
      success: false,
      message: 'Integración con Traccar no configurada en el servidor (TRACCAR_URL ausente)',
    });
  }

  try {
    const baseUrl = config.traccarUrl.replace(/\/+$/, '');
    const tokenQuery = config.traccarToken ? `?token=${encodeURIComponent(config.traccarToken)}` : '';
    const devRes = await fetch(
      `${baseUrl}/api/devices?uniqueId=${encodeURIComponent(gpsDevice.imei)}${tokenQuery ? '&' + tokenQuery.slice(1) : ''}`,
      {
        headers: requestHeaders(),
      }
    );

    if (!devRes.ok) {
      return res.status(502).json({ success: false, message: 'Error comunicando con Traccar para buscar dispositivo' });
    }

    const devices = (await devRes.json()) as any[];
    if (!devices || devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: `El identificador ${gpsDevice.imei} no existe registrado en Traccar`,
      });
    }

    const traccarDeviceId = devices[0].id;
    const commandType = action === 'resume' ? 'engineResume' : 'engineStop';

    const sendRes = await fetch(`${baseUrl}/api/commands/send${tokenQuery}`, {
      method: 'POST',
      headers: requestHeaders(),
      body: JSON.stringify({
        deviceId: traccarDeviceId,
        type: commandType,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text().catch(() => '');
      return res.status(502).json({
        success: false,
        message: `Traccar rechazó el comando: ${errText || sendRes.statusText}`,
      });
    }

    await prisma.trackingEvent
      .create({
        data: {
          type: action === 'resume' ? 'ENGINE_RESUME_SENT' : 'ENGINE_STOP_SENT',
          severity: 'WARNING',
          message: action === 'resume' ? 'Comando de reanudación de motor enviado' : 'Comando de paro de motor enviado',
          timestamp: new Date(),
          gpsDeviceId: gpsDevice.id,
        },
      })
      .catch(() => {});

    return res.json({
      success: true,
      message: action === 'resume' ? 'Comando de reanudación enviado a Traccar' : 'Comando de paro de motor enviado a Traccar',
      command: {
        unitId,
        unitType,
        action,
        timestamp: new Date(),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Error interno al enviar comando' });
  }
}
