import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getMailEnv } from './env';

interface SmtpConfig {
  host: string | undefined;
  port: number;
  user: string | undefined;
  pass: string | undefined;
  from: string | undefined;
  secure: boolean;
}

/** Read SMTP configuration from environment variables at runtime. */
function getSmtpConfig(): SmtpConfig {
  const env = getMailEnv();
  const port = Number(env.SMTP_PORT || 587);
  return {
    host: env.SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
    from: env.MAIL_FROM || env.SMTP_USER,
    secure: (env.SMTP_PORT || '587') === '465'
  };
}

/** Check whether all required SMTP settings are present. */
export function isMailConfigured(): boolean {
  const cfg = getSmtpConfig();
  return !!(cfg.host && cfg.user && cfg.pass && cfg.from);
}

/** Get the configured sender address. */
export function getDefaultFromAddress(): string {
  return getSmtpConfig().from || '';
}

let cachedTransporter: Transporter | null = null;

/** Create or return a cached Nodemailer transporter. */
export function getTransporter(): Transporter | null {
  if (!isMailConfigured()) {
    return null;
  }

  if (cachedTransporter) {
    return cachedTransporter;
  }

  const cfg = getSmtpConfig();

  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    },
    tls: {
      // Accept both trusted and self-signed certificates for Mailcow flexibility.
      // In production with a valid cert this is safe; remove `rejectUnauthorized: false`
      // if your Mailcow instance uses a publicly trusted certificate and you want
      // strict TLS validation.
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
}

/** Reset the cached transporter. Useful in tests or after config changes. */
export function resetTransporter(): void {
  cachedTransporter = null;
}
