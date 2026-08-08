import { getTransporter, isMailConfigured, getDefaultFromAddress } from './transporter';
import { contactConfirmationTemplate } from './templates/contactConfirmation';
import { contactNotificationTemplate } from './templates/contactNotification';
import { getContactNotifyEmail } from './env';
import { isValidEmail } from './config';

export interface SendContactEmailsOptions {
  /** Sender's full name as entered on the contact form. */
  name: string;
  /** Sender's email address (recipient of the confirmation, Reply-To on the notification). */
  email: string;
  /** The body of the message. */
  message: string;
  /** Public site URL, used for logo + CTA links. */
  siteUrl: string;
}

export interface ContactEmailResult {
  ok: boolean;
  reason?: string;
}

export interface SendContactEmailsResult {
  customer: ContactEmailResult;
  owner: ContactEmailResult;
}

/**
 * Send both the customer confirmation and the owner notification for a contact-form
 * submission. The two emails are independent — a failure in one does not affect the
 * other. Each result reports success or a short reason string.
 *
 * The owner's address comes from CONTACT_NOTIFY_EMAIL (falls back to OWNER_EMAIL).
 */
export async function sendContactEmails(
  options: SendContactEmailsOptions
): Promise<SendContactEmailsResult> {
  const result: SendContactEmailsResult = {
    customer: { ok: false, reason: 'not attempted' },
    owner: { ok: false, reason: 'not attempted' }
  };

  if (!isMailConfigured()) {
    const reason = 'SMTP configuration is incomplete';
    result.customer.reason = reason;
    result.owner.reason = reason;
    console.warn('[MAIL] SMTP configuration is incomplete. Skipping contact emails.');
    return result;
  }

  if (!options.email || !isValidEmail(options.email)) {
    result.customer.reason = 'Invalid customer email';
    result.owner.reason = 'Skipped: customer email invalid';
    console.warn('[MAIL] Invalid customer email; skipping contact emails.');
    return result;
  }

  const transporter = getTransporter();
  if (!transporter) {
    const reason = 'Could not create mail transporter';
    result.customer.reason = reason;
    result.owner.reason = reason;
    return result;
  }

  const from = getDefaultFromAddress();

  // 1. Customer confirmation
  try {
    const { subject, html, text } = contactConfirmationTemplate({
      name: options.name,
      message: options.message,
      siteUrl: options.siteUrl
    });
    const info = await transporter.sendMail({
      from,
      to: options.email,
      subject,
      text,
      html,
      replyTo: from
    });
    console.info(
      `[MAIL] Contact confirmation sent to ${options.email}: ${info.messageId || 'no-message-id'}`
    );
    result.customer = { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.customer = { ok: false, reason: message };
    console.error(`[MAIL] Failed to send contact confirmation to ${options.email}: ${message}`);
  }

  // 2. Owner notification (independent — failure does not affect customer result)
  const ownerEmail = getContactNotifyEmail();
  if (!ownerEmail || !isValidEmail(ownerEmail)) {
    result.owner = { ok: false, reason: 'Owner notification email not configured' };
    console.warn(
      '[MAIL] CONTACT_NOTIFY_EMAIL/OWNER_EMAIL not set or invalid. Skipping owner notification.'
    );
  } else {
    try {
      const { subject, html, text } = contactNotificationTemplate({
        name: options.name,
        email: options.email,
        message: options.message,
        siteUrl: options.siteUrl
      });
      const info = await transporter.sendMail({
        from,
        to: ownerEmail,
        subject,
        text,
        html,
        // Reply-To is the customer's email so the owner can respond directly.
        replyTo: options.email
      });
      console.info(
        `[MAIL] Contact notification sent to ${ownerEmail}: ${info.messageId || 'no-message-id'}`
      );
      result.owner = { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.owner = { ok: false, reason: message };
      console.error(
        `[MAIL] Failed to send contact notification to ${ownerEmail}: ${message}`
      );
    }
  }

  return result;
}
