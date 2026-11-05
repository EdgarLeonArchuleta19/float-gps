import crypto from 'crypto';
import { config } from '../config';
import { escapeHtml } from '../utils/html';
import { sendEmail } from './email.service';

type AccessReason = 'welcome' | 'reset';

const COPY: Record<AccessReason, { subject: string; intro: string }> = {
  welcome: {
    subject: 'Tu acceso a floaGPS',
    intro: 'Te dieron acceso a floaGPS. Entra con tu correo y esta contraseña temporal:',
  },
  reset: {
    subject: 'Tu nueva contraseña temporal · floaGPS',
    intro: 'El administrador de tu empresa restableció tu contraseña. Entra con tu correo y esta contraseña temporal:',
  },
};

// Sends a temporary password. On first sign-in the app asks the person to
// replace it with their own, so the temporary one only works once.
export async function sendTemporaryPassword(
  user: { id: string; name: string; email: string },
  password: string,
  reason: AccessReason,
  companyName?: string | null
) {
  const copy = COPY[reason];
  const link = config.appUrl
    ? `<p style="margin:20px 0"><a href="${escapeHtml(config.appUrl)}/login" style="background:#032347;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Entrar a floaGPS</a></p>`
    : '';
  const sent = await sendEmail({
    to: user.email,
    idempotencyKey: `access/${reason}/${user.id}/${crypto.createHash('sha256').update(password).digest('hex').slice(0, 16)}`,
    subject: copy.subject,
    html: `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1d1d1f">
        <h2 style="color:#032347;margin:0 0 8px">Hola, ${escapeHtml(user.name)}</h2>
        ${companyName ? `<p style="color:#6b7280;margin:0 0 12px">${escapeHtml(companyName)}</p>` : ''}
        <p>${copy.intro}</p>
        <p style="font-size:22px;font-weight:700;letter-spacing:2px;color:#032347;margin:16px 0;font-family:Menlo,Consolas,monospace">${escapeHtml(password)}</p>
        <p>Usuario: <b>${escapeHtml(user.email)}</b></p>
        ${link}
        <p style="color:#6b7280">Al entrar te pediremos crear tu propia contraseña. Si no esperabas este correo, avisa al administrador de tu empresa.</p>
      </div>`,
  });
  if (!sent && config.nodeEnv !== 'production') {
    console.log(`[EMAIL-DEV] Contraseña temporal para ${user.email}: ${password}`);
  }
  return sent;
}
