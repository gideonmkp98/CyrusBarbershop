import {
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_CONTACT,
  COPYRIGHT_YEAR,
  escapeHtml,
  formatDutchDate
} from '../config';

export interface ContactNotificationData {
  /** Sender's full name (submitted via the contact form). */
  name: string;
  /** Sender's email — also used as Reply-To on the outgoing email. */
  email: string;
  /** Body of the message the customer submitted. */
  message: string;
  /** Public site URL — used only to mention which form the message came from. */
  siteUrl: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const ICONS = {
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
  message: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.9 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.9-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`,
  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
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

export function contactNotificationTemplate(data: ContactNotificationData): EmailContent {
  const safeSiteUrl = escapeHtml(data.siteUrl).replace(/\/$/, '');
  const logoUrl = `${safeSiteUrl}/images/logo.jpeg`;

  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const messageHtml = escapeHtml(data.message);
  const rawMessageText = data.message || '';
  const safeNameText = data.name || 'onbekend';
  const safeEmailText = data.email || 'onbekend';
  const receivedAtText = formatDutchDate(new Date());

  const subject = `Nieuw contactbericht van ${safeNameText}`;

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
              <h1 class="title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#F2CA50;letter-spacing:-0.01em;line-height:1.2;">Nieuw contactbericht</h1>
              <p style="margin:14px 0 0;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#99907c;font-weight:600;">Via het contactformulier op ${safeSiteUrl}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="padding" style="padding:40px 40px 32px;">
              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#d0c5af;">Er is een nieuw bericht binnengekomen via het contactformulier. Je kunt direct reply-en op deze mail om de klant te antwoorden.</p>

              <!-- Sender card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Afzender</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${detailRow(ICONS.user, 'Naam', data.name)}
                      ${detailRow(ICONS.mail, 'E-mail', data.email)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Bericht</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:20px;height:20px;line-height:0;" aria-hidden="true">${ICONS.message}</span>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;color:#e2e2e2;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;">${messageHtml}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Quick reply CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#D4AF37;border-radius:0;text-align:center;mso-padding-alt:14px 32px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${safeEmail}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="0%" stroke="false" fillcolor="#D4AF37">
                    <w:anchorlock/>
                    <center style="color:#3C2F00;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Antwoord klant</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="mailto:${safeEmail}" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;color:#3C2F00;text-decoration:none;text-transform:uppercase;letter-spacing:0.15em;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Antwoord klant</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#666;line-height:1.5;">
                Ontvangen op ${escapeHtml(receivedAtText)}
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
              <span style="display:none;">${ICONS.clock}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${BUSINESS_NAME}
Nieuw contactbericht

Er is een nieuw bericht binnengekomen via het contactformulier op ${safeSiteUrl}.

AFZENDER
- Naam: ${safeNameText}
- E-mail: ${safeEmailText}

BERICHT
${rawMessageText}

Antwoord de klant door te reply-en op deze mail (Reply-To is ingesteld op ${safeEmailText}).

Ontvangen op ${receivedAtText}.

${BUSINESS_NAME}
${BUSINESS_ADDRESS.street}
${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}
${BUSINESS_CONTACT.email}

© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Interne notificatie.`;

  return { subject, html, text };
}
