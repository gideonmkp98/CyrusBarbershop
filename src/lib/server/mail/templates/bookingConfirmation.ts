import {
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_CONTACT,
  SOCIAL_LINKS,
  COPYRIGHT_YEAR,
  escapeHtml,
  formatDutchDate,
  formatDuration,
  formatPrice,
  extractFirstName
} from '../config';

export interface BookingConfirmationData {
  /** Recipient email address (used by the caller, not rendered inside the body). */
  to?: string;
  /** Full client name; the template derives the first name. */
  clientName: string;
  serviceName: string;
  barberName: string | null | undefined;
  /** ISO date string YYYY-MM-DD or Date object. */
  date: string | Date;
  /** Time string HH:MM. */
  time: string;
  duration: number;
  price: string | number;
  notes?: string | null;
  /** Public site URL, used for logo and CTA links. */
  siteUrl: string;
  /** Optional appointment ID for support references. */
  appointmentId?: number | string | null;
  /** Optional list of selected add-on services (rendered under the main service). */
  addOns?: { name: string; price: string | number }[];
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const ICONS = {
  scissors: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  euro: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8.5c-1.5-1.5-4-1.5-5.5 0s-1.5 4 0 5.5 4 1.5 5.5 0"></path><path d="M7 10h5"></path><path d="M7 14h5"></path></svg>`,
  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>`,
  message: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.9 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.9-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`
};

function detailRow(icon: string, label: string, value: string): string {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  return `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="width:32px;vertical-align:top;">
              <span style="display:inline-block;width:20px;height:20px;line-height:0;" aria-hidden="true">${icon}</span>
            </td>
            <td style="vertical-align:top;">
              <span style="display:block;font-size:11px;letter-spacing:0.15em;color:#99907c;text-transform:uppercase;font-weight:600;">${safeLabel}</span>
              <span style="display:block;font-size:16px;color:#e2e2e2;font-weight:500;line-height:1.5;">${safeValue}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function bookingConfirmationTemplate(data: BookingConfirmationData): EmailContent {
  const safeSiteUrl = escapeHtml(data.siteUrl).replace(/\/$/, '');
  const logoUrl = `${safeSiteUrl}/images/logo.jpeg`;

  // HTML-escaped values for the HTML body
  const firstNameHtml = escapeHtml(extractFirstName(data.clientName));
  const dateTextHtml = escapeHtml(formatDutchDate(data.date));
  const timeTextHtml = escapeHtml(data.time);
  const durationTextHtml = escapeHtml(formatDuration(data.duration));
  const priceTextHtml = escapeHtml(formatPrice(data.price));
  const notesHtml = data.notes ? escapeHtml(data.notes) : '';
  const appointmentRefHtml = data.appointmentId ? `Afspraaknummer: ${escapeHtml(data.appointmentId)}` : '';

  // Add-ons: render only if any were selected
  const addOnsHtml = (data.addOns ?? [])
    .filter(a => a && a.name)
    .map(a => `<tr><td style="padding:6px 0 6px 24px;color:#d0c5af;font-size:15px;">+ ${escapeHtml(a.name)} <span style="color:#99907c;font-size:13px;margin-left:6px;">(${escapeHtml(formatPrice(a.price))})</span></td></tr>`)
    .join('');
  const addOnsSectionHtml = addOnsHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 14px;border-left:2px solid rgba(212,175,55,0.25);padding-left:14px;">${addOnsHtml}</table>`
    : '';

  // Raw values for the plain text body
  const firstNameText = extractFirstName(data.clientName);
  const serviceNameText = data.serviceName;
  const barberNameText = data.barberName || 'Geen voorkeur';
  const dateTextText = formatDutchDate(data.date);
  const timeTextText = data.time;
  const durationTextText = formatDuration(data.duration);
  const priceTextText = formatPrice(data.price);
  const notesText = data.notes || '';
  const appointmentRefText = data.appointmentId ? `Afspraaknummer: ${data.appointmentId}` : '';
  const addOnsTextList = (data.addOns ?? []).filter(a => a && a.name);
  const addOnsText = addOnsTextList.length > 0
    ? addOnsTextList.map(a => `  - ${a.name} (${formatPrice(a.price)})`).join('\n') + '\n'
    : '';

  const socialLinks: string[] = [];
  if (SOCIAL_LINKS.instagram) {
    socialLinks.push(`<a href="${escapeHtml(SOCIAL_LINKS.instagram)}" style="display:inline-block;margin:0 8px;color:#99907c;text-decoration:none;font-size:12px;">Instagram</a>`);
  }
  if (SOCIAL_LINKS.facebook) {
    socialLinks.push(`<a href="${escapeHtml(SOCIAL_LINKS.facebook)}" style="display:inline-block;margin:0 8px;color:#99907c;text-decoration:none;font-size:12px;">Facebook</a>`);
  }
  const socialBlock = socialLinks.length
    ? `<p style="margin:0 0 16px;">${socialLinks.join('')}</p>`
    : '';

  const subject = `Je afspraak bij ${BUSINESS_NAME} is bevestigd`;

  const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .padding { padding: 32px 24px !important; }
    }
    @media only screen and (max-width: 480px) {
      .padding { padding: 28px 20px !important; }
      .title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#121414;color:#e2e2e2;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table class="container" role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#1a1c1c;border:1px solid rgba(212,175,55,0.12);border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.45);">
          <!-- Header -->
          <tr>
            <td class="padding" style="padding:48px 40px 36px;text-align:center;background:linear-gradient(180deg,#1e2020 0%,#1a1c1c 100%);border-bottom:1px solid rgba(212,175,55,0.12);">
              <img src="${logoUrl}" alt="${BUSINESS_NAME} logo" width="64" height="64" style="display:block;margin:0 auto 20px;border-radius:50%;object-fit:contain;">
              <h1 class="title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#F2CA50;letter-spacing:-0.01em;line-height:1.2;">Je afspraak is bevestigd</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="padding" style="padding:40px 40px 32px;">
              <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#e2e2e2;">Hallo ${firstNameHtml},</p>
              <p style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#d0c5af;">Bedankt voor je afspraak bij <strong style="color:#e2e2e2;">${escapeHtml(BUSINESS_NAME)}</strong>. We kijken ernaar uit je binnenkort te verwelkomen in onze shop in Leiden.</p>

              <!-- Appointment card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Afspraakdetails</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${detailRow(ICONS.scissors, 'Behandeling', data.serviceName)}
                      ${addOnsSectionHtml}
                      ${detailRow(ICONS.user, 'Barber', data.barberName || 'Geen voorkeur')}
                      ${detailRow(ICONS.calendar, 'Datum', dateTextHtml)}
                      ${detailRow(ICONS.clock, 'Tijd', timeTextHtml)}
                      ${detailRow(ICONS.clock, 'Duur', durationTextHtml)}
                      ${detailRow(ICONS.euro, 'Prijs', priceTextHtml)}
                      ${detailRow(ICONS.mapPin, 'Locatie', `${BUSINESS_ADDRESS.street}, ${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}`)}
                      ${notesHtml ? detailRow(ICONS.message, 'Opmerkingen', notesHtml) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${appointmentRefHtml ? `<p style="margin:0 0 24px;font-size:12px;color:#666;line-height:1.5;">${appointmentRefHtml}</p>` : ''}

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#D4AF37;border-radius:0;text-align:center;mso-padding-alt:14px 32px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeSiteUrl}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="0%" stroke="false" fillcolor="#D4AF37">
                    <w:anchorlock/>
                    <center style="color:#3C2F00;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Bekijk onze website</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${safeSiteUrl}" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;color:#3C2F00;text-decoration:none;text-transform:uppercase;letter-spacing:0.15em;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Bekijk onze website</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;line-height:1.7;color:#99907c;">
                Heb je vragen of wil je je afspraak wijzigen? Neem contact met ons op via
                <a href="mailto:${escapeHtml(BUSINESS_CONTACT.email)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.email)}</a>
                of bel
                <a href="tel:${escapeHtml(BUSINESS_CONTACT.phoneRaw)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.phone)}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px;background:#121414;border-top:1px solid rgba(212,175,55,0.08);text-align:center;">
              <img src="${logoUrl}" alt="${BUSINESS_NAME}" width="40" height="40" style="display:block;margin:0 auto 12px;border-radius:50%;object-fit:contain;">
              <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:#D4AF37;letter-spacing:0.1em;font-weight:600;">${BUSINESS_NAME}</p>
              <p style="margin:0 0 16px;font-size:13px;color:#99907c;line-height:1.7;">
                ${escapeHtml(BUSINESS_ADDRESS.street)}<br>
                ${escapeHtml(BUSINESS_ADDRESS.postalCode)} ${escapeHtml(BUSINESS_ADDRESS.city)}<br>
                <a href="mailto:${escapeHtml(BUSINESS_CONTACT.email)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.email)}</a><br>
                <a href="tel:${escapeHtml(BUSINESS_CONTACT.phoneRaw)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.phone)}</a>
              </p>
              ${socialBlock}
              <p style="margin:0;font-size:11px;color:#666;">© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Alle rechten voorbehouden.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${BUSINESS_NAME}
Je afspraak is bevestigd

Hallo ${firstNameText},

Bedankt voor je afspraak bij ${BUSINESS_NAME}. We kijken ernaar uit je binnenkort te verwelkomen in onze shop in Leiden.

AFSPRAAKDETAILS
- Behandeling: ${serviceNameText}
${addOnsText}- Barber: ${barberNameText}
- Datum: ${dateTextText}
- Tijd: ${timeTextText}
- Duur: ${durationTextText}
- Prijs: ${priceTextText}
- Locatie: ${BUSINESS_ADDRESS.street}, ${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}
${notesText ? `- Opmerkingen: ${notesText}\n` : ''}${appointmentRefText ? `${appointmentRefText}\n` : ''}
Bekijk onze website: ${safeSiteUrl}

Heb je vragen of wil je je afspraak wijzigen? Neem contact met ons op via ${BUSINESS_CONTACT.email} of bel ${BUSINESS_CONTACT.phone}.

${BUSINESS_NAME}
${BUSINESS_ADDRESS.street}
${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}
${BUSINESS_CONTACT.email}
${BUSINESS_CONTACT.phone}

© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Alle rechten voorbehouden.`;

  return { subject, html, text };
}
