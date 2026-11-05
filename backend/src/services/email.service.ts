import nodemailer from 'nodemailer';

interface EmailMessage {
  to: string;
  idempotencyKey?: string;
  subject: string;
  html: string;
}

// Provider selection, in order:
//   1. SMTP (e.g. Gmail with an app password) when SMTP_USER and SMTP_PASS are set.
//      Works without owning a domain; Gmail allows ~500 messages/day.
//   2. Resend when RESEND_API_KEY is set. Without a verified domain Resend only
//      delivers to the account owner's address.
// Returns false when nothing is configured or delivery failed, so callers can
// fall back (e.g. print the code in development).
export function emailAvailable() {
  return !!((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.RESEND_API_KEY);
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return sendWithSmtp(message);
  if (process.env.RESEND_API_KEY) return sendWithResend(message, process.env.RESEND_API_KEY);
  return false;
}

let smtpTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransport() {
  if (!smtpTransport) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      // Google shows app passwords in groups ("abcd efgh ..."); the spaces aren't part of it.
      auth: { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '') },
    });
  }
  return smtpTransport;
}

async function sendWithSmtp(message: EmailMessage): Promise<boolean> {
  try {
    // Gmail rewrites any other sender to the authenticated account, so default to it.
    await getSmtpTransport().sendMail({
      from: process.env.EMAIL_FROM || `floaGPS <${process.env.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
    });
    return true;
  } catch (err: any) {
    console.error('[EMAIL] Error enviando por SMTP:', err?.message || err);
    return false;
  }
}

async function sendWithResend(message: EmailMessage, apiKey: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Lets Resend drop duplicates if the same message is retried after a network error.
        ...(message.idempotencyKey ? { 'Idempotency-Key': message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'floaGPS <onboarding@resend.dev>',
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      console.error('[EMAIL] Resend respondió', res.status, await res.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.error('[EMAIL] Error enviando por Resend:', err);
    return false;
  }
}
