import { getTransporter, isMailConfigured, getDefaultFromAddress } from './transporter';
import { bookingNotificationTemplate, type BookingNotificationData } from './templates/bookingNotification';
import { getBookingNotifyEmail } from './env';
import { isValidEmail } from './config';

export type SendBookingNotificationOptions = BookingNotificationData;

/**
 * Send a new-appointment notification to the shop owner / booking inbox.
 *
 * The recipient is resolved from BOOKING_NOTIFY_EMAIL, falling back to
 * CONTACT_NOTIFY_EMAIL and then OWNER_EMAIL. Returns { ok: true } when sent,
 * or { ok: false, reason: string } when skipped or failed. The caller decides
 * whether a failure should impact the HTTP response — by design it never does.
 */
export async function sendBookingNotification(
  options: SendBookingNotificationOptions
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isMailConfigured()) {
    console.warn('[MAIL] SMTP configuration is incomplete. Skipping booking notification email.');
    return { ok: false, reason: 'SMTP configuration is incomplete' };
  }

  const ownerEmail = getBookingNotifyEmail();
  if (!ownerEmail || !isValidEmail(ownerEmail)) {
    console.warn(
      '[MAIL] BOOKING_NOTIFY_EMAIL/CONTACT_NOTIFY_EMAIL/OWNER_EMAIL not set or invalid. Skipping booking notification.'
    );
    return { ok: false, reason: 'Owner notification email not configured' };
  }

  if (!options.clientEmail || !isValidEmail(options.clientEmail)) {
    console.warn('[MAIL] Invalid client email; skipping booking notification (no Reply-To).');
    return { ok: false, reason: 'Invalid client email address' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[MAIL] Could not create mail transporter. Skipping booking notification.');
    return { ok: false, reason: 'Could not create mail transporter' };
  }

  const { subject, html, text } = bookingNotificationTemplate(options);
  const from = getDefaultFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      to: ownerEmail,
      subject,
      text,
      html,
      // Reply-To is the customer's email so the owner can respond directly.
      replyTo: options.clientEmail
    });

    console.info(`[MAIL] Booking notification sent to ${ownerEmail}: ${info.messageId || 'no-message-id'}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[MAIL] Failed to send booking notification to ${ownerEmail}: ${message}`);
    return { ok: false, reason: message };
  }
}