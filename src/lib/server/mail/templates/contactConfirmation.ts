import {
  BUSINESS_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_CONTACT,
  SOCIAL_LINKS,
  COPYRIGHT_YEAR,
  escapeHtml,
  extractFirstName
} from '../config';

export interface ContactConfirmationData {
  /** Sender's full name as entered on the contact form. */
  name: string;
  /** The body of the message the customer submitted — echoed back for confirmation. */
  message: string;
  /** Public site URL, used for logo and CTA links. */
  siteUrl: string;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const ICONS = {
  message: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.9 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.9-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`
};

export function contactConfirmationTemplate(data: ContactConfirmationData): EmailContent {
  const safeSiteUrl = escapeHtml(data.siteUrl).replace(/\/$/, '');
  const logoUrl = `${safeSiteUrl}/images/logo.jpeg`;

  const firstNameHtml = escapeHtml(extractFirstName(data.name));
  const messageHtml = escapeHtml(data.message);
  const safeNameText = data.name || 'daar';
  const firstNameText = extractFirstName(data.name);
  const messageText = data.message || '';

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

  const subject = `We hebben je bericht ontvangen — ${BUSINESS_NAME}`;

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
              <h1 class="title" style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:#F2CA50;letter-spacing:-0.01em;line-height:1.2;">Bedankt voor je bericht</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="padding" style="padding:40px 40px 32px;">
              <p style="margin:0 0 14px;font-size:17px;line-height:1.6;color:#e2e2e2;">Hallo ${firstNameHtml},</p>
              <p style="margin:0 0 32px;font-size:16px;line-height:1.7;color:#d0c5af;">We hebben je bericht goed ontvangen en nemen zo snel mogelijk contact met je op. Meestal reageren we binnen één werkdag.</p>

              <!-- Message echo -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#1e2020;border:1px solid rgba(212,175,55,0.10);border-radius:12px;margin-bottom:32px;">
                <tr>
                  <td style="padding:28px;">
                    <h2 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Je bericht</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width:32px;vertical-align:top;">
                          <span style="display:inline-block;width:20px;height:20px;line-height:0;" aria-hidden="true">${ICONS.message}</span>
                        </td>
                        <td style="vertical-align:top;">
                          <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:#d0c5af;line-height:1.7;white-space:pre-wrap;word-wrap:break-word;">${messageHtml}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#D4AF37;border-radius:0;text-align:center;mso-padding-alt:14px 32px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeSiteUrl}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="0%" stroke="false" fillcolor="#D4AF37">
                    <w:anchorlock/>
                    <center style="color:#3C2F00;font-family:sans-serif;font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;">Bezoek onze website</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${safeSiteUrl}" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;color:#3C2F00;text-decoration:none;text-transform:uppercase;letter-spacing:0.15em;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Bezoek onze website</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;line-height:1.7;color:#99907c;">
                Heb je tussendoor nog vragen? Bel ons op
                <a href="tel:${escapeHtml(BUSINESS_CONTACT.phoneRaw)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.phone)}</a>
                of stuur een bericht naar
                <a href="mailto:${escapeHtml(BUSINESS_CONTACT.email)}" style="color:#D4AF37;text-decoration:none;">${escapeHtml(BUSINESS_CONTACT.email)}</a>.
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
Bedankt voor je bericht

Hallo ${firstNameText},

We hebben je bericht goed ontvangen en nemen zo snel mogelijk contact met je op. Meestal reageren we binnen één werkdag.

JE BERICHT
${messageText}

Bezoek onze website: ${safeSiteUrl}

Heb je tussendoor nog vragen? Bel ons op ${BUSINESS_CONTACT.phone} of stuur een bericht naar ${BUSINESS_CONTACT.email}.

${BUSINESS_NAME}
${BUSINESS_ADDRESS.street}
${BUSINESS_ADDRESS.postalCode} ${BUSINESS_ADDRESS.city}
${BUSINESS_CONTACT.email}
${BUSINESS_CONTACT.phone}

© ${COPYRIGHT_YEAR} ${BUSINESS_NAME}. Alle rechten voorbehouden.`;

  // Reference safeNameText so the variable isn't flagged unused while preserving the
  // raw-name intent for future template variants.
  void safeNameText;

  return { subject, html, text };
}
