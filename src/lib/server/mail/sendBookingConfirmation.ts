import { getTransporter, isMailConfigured, getDefaultFromAddress } from './transporter';
import { bookingConfirmationTemplate, type BookingConfirmationData } from './templates/bookingConfirmation';
import { isValidEmail } from './config';

export interface SendBookingConfirmationOptions extends BookingConfirmationData {
  /** Recipient email address. Required for sending. */
  to: string;
}

/**
 * Send a booking confirmation email.
 * Returns { ok: true } when sent, or { ok: false, reason: string } when skipped or failed.
 * The caller decides whether a failure should impact the HTTP response.
 */
export async function sendBookingConfirmation(
  options: SendBookingConfirmationOptions
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isMailConfigured()) {
    console.warn('[MAIL] SMTP configuration is incomplete. Skipping booking confirmation email.');
    return { ok: false, reason: 'SMTP configuration is incomplete' };
  }

  if (!options.to || !isValidEmail(options.to)) {
    console.warn('[MAIL] Invalid recipient email address. Skipping booking confirmation email.');
    return { ok: false, reason: 'Invalid recipient email address' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[MAIL] Could not create mail transporter. Skipping booking confirmation email.');
    return { ok: false, reason: 'Could not create mail transporter' };
  }

  const { subject, html, text } = bookingConfirmationTemplate(options);
  const from = getDefaultFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject,
      text,
      html,
      replyTo: from
    });

    console.info(`[MAIL] Booking confirmation sent to ${options.to}: ${info.messageId || 'no-message-id'}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[MAIL] Failed to send booking confirmation to ${options.to}: ${message}`);
    return { ok: false, reason: message };
  }
}
