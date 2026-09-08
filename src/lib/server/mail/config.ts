// Business constants used across all transactional email templates.
// These values are brand-specific and do not contain credentials.

export const BUSINESS_NAME = 'Cyrus Barbershop';

export const BUSINESS_ADDRESS = {
  street: 'Kennedylaan 9e',
  postalCode: '2324 ER',
  city: 'Leiden'
};

export const BUSINESS_CONTACT = {
  email: 'info@cyrusbarbershop.nl',
  phone: '06 2923 1030',
  phoneRaw: '+31629231030',
  whatsapp: 'https://wa.me/31629231030'
};

export const SOCIAL_LINKS = {
  instagram: '', // e.g. 'https://instagram.com/cyrusbarbershop'
  facebook: '' // e.g. 'https://facebook.com/cyrusbarbershop'
};

export const COPYRIGHT_YEAR = new Date().getFullYear();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validate that a string looks like an email address. */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/** Escape HTML entities to prevent HTML injection in email templates. */
export function escapeHtml(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Format a MySQL/ISO date string or Date object to a Dutch long date. */
export function formatDutchDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  return new Intl.DateTimeFormat('nl-NL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(d);
}

/** Format a decimal or number to Dutch euros. */
export function formatPrice(price: string | number): string {
  const value = typeof price === 'string' ? Number.parseFloat(price) : price;
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number.isFinite(value) ? value : 0);
}

/** Format minutes as a human-readable duration. */
export function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

/** Extract a first name from a full name, falling back to the full name. */
export function extractFirstName(fullName: string): string {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return 'daar';
  return trimmed.split(/\s+/)[0];
}
