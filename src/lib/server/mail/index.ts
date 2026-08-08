// Public mail API — import from `$lib/server/mail`
export { sendBookingConfirmation } from './sendBookingConfirmation';
export { sendContactEmails } from './sendContactEmails';
export { isMailConfigured, getTransporter, getDefaultFromAddress } from './transporter';
export {
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_CONTACT,
  SOCIAL_LINKS,
  COPYRIGHT_YEAR,
  isValidEmail,
  escapeHtml,
  formatDutchDate,
  formatDuration,
  formatPrice,
  extractFirstName
} from './config';
export { bookingConfirmationTemplate } from './templates/bookingConfirmation';
export { contactConfirmationTemplate } from './templates/contactConfirmation';
export { contactNotificationTemplate } from './templates/contactNotification';
export type { BookingConfirmationData } from './templates/bookingConfirmation';
export type { ContactConfirmationData } from './templates/contactConfirmation';
export type { ContactNotificationData } from './templates/contactNotification';
export type { SendBookingConfirmationOptions } from './sendBookingConfirmation';
export type { SendContactEmailsOptions, SendContactEmailsResult, ContactEmailResult } from './sendContactEmails';
