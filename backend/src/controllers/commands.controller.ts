import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { getTenant } from '../middleware/auth';
import { engineCommandLimiter } from '../middleware/rateLimit';
import { getClientIp } from '../services/audit.service';
import { canAccessUnit } from '../services/unitAccess';

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

// The account password is always required: the biometric path on mobile only
// unlocks a password saved in the device keychain, it never skips this check.
// Wrong passwords answer 403, not 401, so the client does not log the user out.
async function confirmPassword(req: Request, userId: string): Promise<string | null> {
  const password = req.body?.password;
  if (typeof password !== 'string' || !password) return 'Confirma el comando con tu contraseña';
  const keys = [`engine:user:${userId}`, `engine:ip:${getClientIp(req)}`];
  try {
    engineCommandLimiter.assertAllowed(keys, 'Demasiados intentos de confirmación.');
  } catch (err: any) {
    return err.message;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  const ok = !!user && (await bcrypt.compare(password, user.password).catch(() => false));
  if (!ok) {
    engineCommandLimiter.recordFailure(keys);
    return 'Contraseña de confirmación incorrecta';
  }
  engineCommandLimiter.clear(keys);
  return null;
}

export async function handleEngineCommand(req: Request, res: Response) {
  const { unitId, unitType, action = 'stop' } = req.body || {};
  const tenant = getTenant(req);

  if (typeof unitId !== 'string' || !unitId || (unitType !== 'vehicle' && unitType !== 'machine')) {
    return res.status(400).json({ success: false, message: 'unitId y unitType (vehicle o machine) son requeridos' });
  }
  if (action !== 'stop' && action !== 'resume') {
    return res.status(400).json({ success: false, message: 'La acción debe ser stop o resume' });
  }

  const confirmError = await confirmPassword(req, tenant.userId);
  if (confirmError) {
    return res.status(403).json({ success: false, message: confirmError });
  }

  if (!(await canAccessUnit(unitType, unitId, tenant))) {
    return res.status(403).json({ success: false, message: 'No tienes autorización sobre esta unidad' });
  }

  const gpsDevice =
    unitType === 'vehicle'
      ? await prisma.gpsDevice.findUnique({ where: { vehicleId: unitId } })
      : await prisma.gpsDevice.findUnique({ where: { machineId: unitId } });

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
