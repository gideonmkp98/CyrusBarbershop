import {
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_CONTACT,
  COPYRIGHT_YEAR,
  escapeHtml,
  formatDutchDate,
  formatDuration,
  formatPrice
} from '../config';

export interface BookingNotificationData {
  /** Full client name. */
  clientName: string;
  /** Client email — used as Reply-To on the outgoing email. */
  clientEmail: string;
  /** Client phone, optional. */
  clientPhone?: string | null;
  /** Name of the booked service. */
  serviceName: string;
  /** Barber display name, or null when no preference was selected. */
  barberName: string | null | undefined;
  /** ISO date string YYYY-MM-DD or Date object. */
  date: string | Date;
  /** Time string HH:MM. */
  time: string;
  /** Total service duration in minutes (including add-ons). */
  duration: number;
  /** Total price (main service + add-ons). */
  price: string | number;
  /** Optional client notes. */
  notes?: string | null;
  /** Public site URL — used for the logo only. */
  siteUrl: string;
  /** Optional appointment ID for back-office reference. */
  appointmentId?: number | string | null;
  /** Optional list of selected add-on services. */
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
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  phone: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
  euro: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8.5c-1.5-1.5-4-1.5-5.5 0s-1.5 4 0 5.5 4 1.5 5.5 0"></path><path d="M7 10h5"></path><path d="M7 14h5"></path></svg>`,
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
              <span style="display:block;font-size:16px;color:#e2e2e2;font-weight:500;line-height:1.5;word-break:break-all;">${safeValue}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function bookingNotificationTemplate(data: BookingNotificationData): EmailContent {
  const safeSiteUrl = escapeHtml(data.siteUrl).replace(/\/$/, '');
  const logoUrl = `${safeSiteUrl}/images/logo.jpeg`;

  const clientNameHtml = escapeHtml(data.clientName);
  const clientEmailHtml = escapeHtml(data.clientEmail);
  const clientPhoneHtml = data.clientPhone ? escapeHtml(data.clientPhone) : '';
  const dateHtml = escapeHtml(formatDutchDate(data.date));
  const timeHtml = escapeHtml(data.time);
  const durationHtml = escapeHtml(formatDuration(data.duration));
  const priceHtml = escapeHtml(formatPrice(data.price));
  const notesHtml = data.notes ? escapeHtml(data.notes) : '';
  const appointmentRefHtml = data.appointmentId ? `Afspraaknummer: ${escapeHtml(data.appointmentId)}` : '';

  const addOnsHtml = (data.addOns ?? [])
    .filter(a => a && a.name)
    .map(a => `<tr><td style="padding:6px 0 6px 24px;color:#d0c5af;font-size:15px;">+ ${escapeHtml(a.name)} <span style="color:#99907c;font-size:13px;margin-left:6px;">(${escapeHtml(formatPrice(a.price))})</span></td></tr>`)
    .join('');
  const addOnsSectionHtml = addOnsHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 14px;border-left:2px solid rgba(212,175,55,0.25);padding-left:14px;">${addOnsHtml}</table>`
    : '';

  // Plain text values
  const clientNameText = data.clientName || 'onbekend';
  const clientEmailText = data.clientEmail || 'onbekend';
  const clientPhoneText = data.clientPhone || 'niet opgegeven';
  const serviceNameText = data.serviceName;
  const barberNameText = data.barberName || 'Geen voorkeur';
  const dateText = formatDutchDate(data.date);
  const timeText = data.time;
  const durationText = formatDuration(data.duration);
  const priceText = formatPrice(data.price);
  const notesText = data.notes || '';
  const appointmentRefText = data.appointmentId ? `Afspraaknummer: ${data.appointmentId}` : '';
  const addOnsTextList = (data.addOns ?? []).filter(a => a && a.name);
  const addOnsText = addOnsTextList.length > 0
    ? addOnsTextList.map(a => `  - ${a.name} (${formatPrice(a.price)})`).join('\n') + '\n'
    : '';
  const receivedAtText = formatDutchDate(new Date());

  const subject = `Nieuwe afspraak geboekt door ${clientNameText}`;

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
              <h1 class="title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#F2CA50;letter-spacing:-0.01em;line-height:1.2;">Nieuwe afspraak</h1>
              <p style="margin:14px 0 0;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#99907c;font-weight:600;">Via de website</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="padding" style="padding:40px 40px 32px;">
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#d0c5af;">Er is een nieuwe afspraak geboekt via de website. Je kunt direct reply-en op deze mail om de klant te antwoorden.</p>

              <!-- Client card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Klant</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${detailRow(ICONS.user, 'Naam', data.clientName)}
                      ${detailRow(ICONS.mail, 'E-mail', data.clientEmail)}
                      ${clientPhoneHtml ? detailRow(ICONS.phone, 'Telefoon', data.clientPhone!) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Appointment card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Afspraakdetails</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${detailRow(ICONS.scissors, 'Behandeling', data.serviceName)}
                      ${addOnsSectionHtml}
                      ${detailRow(ICONS.user, 'Barber', data.barberName || 'Geen voorkeur')}
                      ${detailRow(ICONS.calendar, 'Datum', dateHtml)}
                      ${detailRow(ICONS.clock, 'Tijd', timeHtml)}
                      ${detailRow(ICONS.clock, 'Duur', durationHtml)}
                      ${detailRow(ICONS.euro, 'Prijs', priceHtml)}
                      ${notesHtml ? detailRow(ICONS.message, 'Opmerkingen', notesHtml) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${appointmentRefHtml ? `<p style="margin:0 0 24px;font-size:12px;color:#666;line-height:1.5;">${appointmentRefHtml}</p>` : ''}

              <!-- Quick reply CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#D4AF37;border-radius:0;text-align:center;mso-padding-alt:14px 32px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${clientEmailHtml}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="0%" stroke="false" fillcolor="#D4AF37">
                    <w:anchorlock/>
                    <center style="color:#3C2F00;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Antwoord klant</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="mailto:${clientEmailHtml}" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;color:#3C2F00;text-decoration:none;text-transform:uppercase;letter-spacing:0.15em;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Antwoord klant</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">
                Geboekt op ${escapeHtml(receivedAtText)}
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
                <a href="mailto:${escapeHtml(BUSINESS_CONTACT.email)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.email)}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#666;">© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Interne notificatie.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${BUSINESS_NAME}
Nieuwe afspraak geboekt

Er is een nieuwe afspraak geboekt via de website.

KLANT
- Naam: ${clientNameText}
- E-mail: ${clientEmailText}
- Telefoon: ${clientPhoneText}

AFSPRAAKDETAILS
- Behandeling: ${serviceNameText}
${addOnsText}- Barber: ${barberNameText}
- Datum: ${dateText}
- Tijd: ${timeText}
- Duur: ${durationText}
- Prijs: ${priceText}
${notesText ? `- Opmerkingen: ${notesText}\n` : ''}${appointmentRefText ? `${appointmentRefText}\n` : ''}
Antwoord de klant door te reply-en op deze mail (Reply-To is ingesteld op ${clientEmailText}).

Geboekt op ${receivedAtText}.

${BUSINESS_NAME}
${BUSINESS_ADDRESS.street}
${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}
${BUSINESS_CONTACT.email}

© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Interne notificatie.`;

  return { subject, html, text };
}