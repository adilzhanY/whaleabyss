/**
 * The email design system: ONE layout, four templates. Every customer email
 * (OTP, password reset, order paid, order completed) renders through
 * `renderEmailLayout`, so the brand look lives here and nowhere else.
 *
 * Email-client constraints honoured throughout (this is why it looks nothing
 * like our React code):
 * - tables + fully inline styles — no classes, no <style> blocks that matter;
 * - NO CSS gradients (Outlook drops them) — solid brand blue instead;
 * - system font stack — custom webfonts don't load in most clients;
 * - images by absolute https URL only (Вэлль chibi is served from the site);
 * - a hidden "preheader" span controls the inbox preview line.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://whaleabyss.ru';
const TELEGRAM_URL = 'https://t.me/whaleabyss';
const VALLE_IMG = `${SITE_URL}/images/valle_chibi_happy.png`;

const BRAND = '#0B5191';
const INK = '#172554';
const TEXT = '#334155';
const MUTED = '#64748b';
const BG = '#f1f5f9';
const BORDER = '#e2e8f0';
const FONT = `-apple-system, 'Segoe UI', Roboto, Arial, sans-serif`;

export interface EmailOrderItem {
  title: string;
  quantity: number;
  price?: number;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Centered row of CTA buttons — each in its own cell so the gap survives every client. */
function ctaRow(...buttons: string[]): string {
  const cells = buttons.map((b) => `<td style="padding: 4px 8px;">${b}</td>`).join('');
  return `<table cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;"><tr>${cells}</tr></table>`;
}

/** Brand pill button, bulletproof enough for the clients our customers use. */
function ctaButton(href: string, label: string, variant: 'primary' | 'outline' = 'primary'): string {
  const solid = variant === 'primary';
  return `<a href="${href}" target="_blank" style="display: inline-block; padding: 13px 28px; border-radius: 999px; font-family: ${FONT}; font-size: 15px; font-weight: 700; text-decoration: none; ${
    solid
      ? `background-color: ${BRAND}; color: #ffffff;`
      : `background-color: #ffffff; color: ${BRAND}; border: 2px solid ${BRAND};`
  }">${label}</a>`;
}

/** Вэлль chibi in a circle, hanging over the card's top edge. */
function valleHero(): string {
  return `
    <tr>
      <td align="center" style="padding: 0;">
        <img src="${VALLE_IMG}" width="96" height="96" alt="Вэлль — маскот Whale Abyss"
          style="display: block; width: 96px; height: 96px; border-radius: 999px; border: 4px solid #ffffff; background-color: #eaf2f9; margin-top: -48px;" />
      </td>
    </tr>`;
}

/** Positions list; prices column only when every item carries a price. */
function itemsTable(items: EmailOrderItem[], total?: number): string {
  const withPrices = total != null && items.every((i) => i.price != null);
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 14px; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${TEXT}; border-bottom: 1px solid ${BORDER};">
          ${escapeHtml(item.title)}${item.quantity > 1 ? ` <span style="color: ${MUTED}; font-weight: 400;">×${item.quantity}</span>` : ''}
        </td>
        ${
          withPrices
            ? `<td align="right" style="padding: 10px 14px; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: ${INK}; border-bottom: 1px solid ${BORDER}; white-space: nowrap;">${(
                (item.price as number) * item.quantity
              ).toLocaleString('ru-RU')} ₽</td>`
            : ''
        }
      </tr>`
    )
    .join('');

  const totalRow = withPrices
    ? `<tr>
        <td style="padding: 12px 14px; font-family: ${FONT}; font-size: 15px; font-weight: 800; color: ${INK};">Итого</td>
        <td align="right" style="padding: 12px 14px; font-family: ${FONT}; font-size: 15px; font-weight: 800; color: ${BRAND}; white-space: nowrap;">${(total as number).toLocaleString(
          'ru-RU'
        )} ₽</td>
      </tr>`
    : '';

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid ${BORDER}; border-radius: 12px; border-collapse: separate; overflow: hidden;">
      ${rows}
      ${totalRow}
    </table>`;
}

function renderEmailLayout(opts: {
  preheader: string;
  /** true → Вэлль hangs over the card and the header gets extra bottom room. */
  valle?: boolean;
  title: string;
  subtitle?: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG};">
  <span style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(opts.preheader)}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BG}; padding: 0;">
    <tr>
      <td align="center" style="padding: 32px 16px 48px;">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">

          <!-- brand bar -->
          <tr>
            <td align="center" style="padding: 0 0 20px;">
              <a href="${SITE_URL}" target="_blank" style="font-family: ${FONT}; font-size: 20px; font-weight: 800; letter-spacing: 0.04em; color: ${BRAND}; text-decoration: none;">WHALE&nbsp;ABYSS</a>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; border-collapse: separate; overflow: visible;">
                ${opts.valle ? valleHero() : ''}
                <tr>
                  <td align="center" style="padding: ${opts.valle ? '20px' : '36px'} 32px 0;">
                    <h1 style="margin: 0; font-family: ${FONT}; font-size: 24px; font-weight: 800; color: ${INK};">${escapeHtml(opts.title)}</h1>
                    ${
                      opts.subtitle
                        ? `<p style="margin: 8px 0 0; font-family: ${FONT}; font-size: 15px; color: ${MUTED};">${escapeHtml(opts.subtitle)}</p>`
                        : ''
                    }
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px 32px;">
                    ${opts.bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td align="center" style="padding: 24px 16px 0;">
              <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: ${MUTED};">
                <a href="${SITE_URL}" target="_blank" style="color: ${BRAND}; text-decoration: none; font-weight: 600;">whaleabyss.ru</a>
                &nbsp;·&nbsp;
                <a href="${TELEGRAM_URL}" target="_blank" style="color: ${BRAND}; text-decoration: none; font-weight: 600;">Telegram</a>
              </p>
              <p style="margin: 10px 0 0; font-family: ${FONT}; font-size: 12px; color: #94a3b8;">
                Это автоматическое письмо — отвечать на него не нужно.<br />
                С уважением, команда Whale Abyss
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ── templates ─────────────────────────────────────────────────────────── */

export function otpEmail({ code, username }: { code: string; username: string }): string {
  return renderEmailLayout({
    preheader: `Ваш код подтверждения: ${code}`,
    title: 'Добро пожаловать в Whale Abyss!',
    subtitle: `Привет, ${username}!`,
    bodyHtml: `
      <p style="margin: 0 0 20px; font-family: ${FONT}; font-size: 15px; color: ${TEXT}; text-align: center;">
        Для завершения регистрации введите этот код подтверждения:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <div style="display: inline-block; padding: 16px 32px; background-color: #f8fafc; border: 1px solid ${BORDER}; border-radius: 12px; font-family: ${FONT}; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: ${BRAND};">${escapeHtml(code)}</div>
      </td></tr></table>
      <p style="margin: 20px 0 0; font-family: ${FONT}; font-size: 13px; color: ${MUTED}; text-align: center;">
        Код действителен 15 минут. Если вы не запрашивали его — просто проигнорируйте это письмо.
      </p>`,
  });
}

export function passwordResetEmail({ url }: { url: string }): string {
  return renderEmailLayout({
    preheader: 'Сброс пароля на Whale Abyss',
    title: 'Сброс пароля',
    subtitle: 'Вы запросили сброс пароля для вашего аккаунта',
    bodyHtml: `
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 4px 0 20px;">
        ${ctaButton(url, 'Сбросить пароль')}
      </td></tr></table>
      <p style="margin: 0 0 6px; font-family: ${FONT}; font-size: 13px; color: ${MUTED}; text-align: center;">Или скопируйте эту ссылку в браузер:</p>
      <p style="margin: 0 0 20px; font-family: ${FONT}; font-size: 12px; color: ${BRAND}; word-break: break-all; text-align: center;">${escapeHtml(url)}</p>
      <p style="margin: 0; font-family: ${FONT}; font-size: 13px; color: #b45309; font-weight: 700; text-align: center;">Ссылка действительна 1 час.</p>
      <p style="margin: 12px 0 0; font-family: ${FONT}; font-size: 13px; color: ${MUTED}; text-align: center;">
        Если вы не запрашивали сброс — проигнорируйте письмо, пароль останется прежним.
      </p>`,
  });
}

export function orderPaidEmail({
  orderId8,
  items,
  total,
  date,
}: {
  orderId8: string;
  items: EmailOrderItem[];
  total: number;
  date: Date;
}): string {
  const dateStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  return renderEmailLayout({
    preheader: `Оплата получена — заказ № ${orderId8} передан в работу`,
    valle: true,
    title: 'Оплата получена!',
    subtitle: `Заказ № ${orderId8} · ${dateStr}`,
    bodyHtml: `
      ${itemsTable(items, total)}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background-color: #eaf2f9; border-radius: 12px;">
        <tr><td style="padding: 16px 18px;">
          <p style="margin: 0; font-family: ${FONT}; font-size: 14px; font-weight: 700; color: ${INK};">Что дальше?</p>
          <p style="margin: 6px 0 0; font-family: ${FONT}; font-size: 13.5px; color: ${TEXT}; line-height: 1.55;">
            Мы уже передали заказ качеру. Следить за прогрессом можно в «Моих заказах» — а когда всё будет готово, мы напишем вам ещё раз.
          </p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 24px 0 4px;">
        ${ctaRow(ctaButton(`${SITE_URL}/orders`, 'Мои заказы'), ctaButton(TELEGRAM_URL, 'Мы в Telegram', 'outline'))}
      </td></tr></table>
      <p style="margin: 20px 0 0; font-family: ${FONT}; font-size: 12.5px; color: ${MUTED}; text-align: center;">
        Чек об оплате отправлен платёжной системой отдельным письмом.
      </p>`,
  });
}

export function orderCompletedEmail({
  orderId8,
  items,
}: {
  orderId8: string;
  items: EmailOrderItem[];
}): string {
  return renderEmailLayout({
    preheader: `Заказ № ${orderId8} выполнен — аккаунт свободен`,
    valle: true,
    title: 'Ваш заказ выполнен!',
    subtitle: `Заказ № ${orderId8} · аккаунт свободен, можно заходить`,
    bodyHtml: `
      ${itemsTable(items)}
      <p style="margin: 20px 0 0; font-family: ${FONT}; font-size: 14.5px; color: ${TEXT}; line-height: 1.6; text-align: center;">
        Спасибо, что доверили нам свой аккаунт! Если появятся вопросы по заказу —
        не стесняйтесь, напишите нам в <a href="${TELEGRAM_URL}" target="_blank" style="color: ${BRAND}; font-weight: 700; text-decoration: none;">Telegram</a>, ответим быстро.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 24px 0 4px;">
        ${ctaRow(ctaButton(`${SITE_URL}/reviews/new`, 'Оставить отзыв'), ctaButton(TELEGRAM_URL, 'Написать в Telegram', 'outline'))}
      </td></tr></table>
      <p style="margin: 20px 0 0; font-family: ${FONT}; font-size: 12.5px; color: ${MUTED}; text-align: center;">
        Ваш отзыв помогает другим игрокам решиться — и очень радует Вэлль 🐳
      </p>`,
  });
}
