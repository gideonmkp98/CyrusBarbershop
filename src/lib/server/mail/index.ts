// Public mail API — import from `$lib/server/mail`
export { sendBookingConfirmation } from './sendBookingConfirmation';
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
export type { BookingConfirmationData } from './templates/bookingConfirmation';
export type { SendBookingConfirmationOptions } from './sendBookingConfirmation';
