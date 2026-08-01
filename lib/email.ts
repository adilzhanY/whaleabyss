import nodemailer from 'nodemailer';
import {
  otpEmail,
  passwordResetEmail,
  orderPaidEmail,
  orderCompletedEmail,
  type EmailOrderItem,
} from './emailTemplates';

/**
 * The ONE place that talks SMTP. Every outgoing email goes through
 * `sendEmail`; the HTML comes from lib/emailTemplates.ts. Don't create
 * per-route transporters again — that's how we ended up with three copies
 * of this config in three files.
 */

const port = Number(process.env.EMAIL_SERVER_PORT || 465);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port,
  // 465 = implicit TLS; anything else (587) = STARTTLS, and we refuse to
  // silently downgrade to plaintext.
  secure: port === 465,
  requireTLS: port !== 465,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  // Bounded waits: a hung Zoho socket must never stall a caller — the
  // Freekassa webhook awaits sends (inside try/catch) and has to answer
  // "YES" before FK's own timeout.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

/**
 * Zoho rejects From addresses that aren't the authenticated mailbox or a
 * verified alias — keep this exact From everywhere, don't vary per template.
 */
const FROM = `"Whale Abyss" <${process.env.EMAIL_FROM}>`;

/** Throws on failure — auth routes rely on the exception for their 500s. */
export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<void> {
  await transporter.sendMail({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
  console.log(`[Email] "${opts.subject}" sent to ${opts.to}`);
}

export async function sendOtpEmail(to: string, code: string, username: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Ваш код подтверждения — Whale Abyss',
    html: otpEmail({ code, username }),
  });
}

export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Сброс пароля — Whale Abyss',
    html: passwordResetEmail({ url }),
  });
}

export interface OrderEmailData {
  orderId: string;
  items: EmailOrderItem[];
  totalAmount: number;
  orderDate: Date;
}

export async function sendOrderPaidEmail(to: string, data: OrderEmailData): Promise<void> {
  const orderId8 = data.orderId.slice(0, 8).toUpperCase();
  await sendEmail({
    to,
    subject: `✅ Заказ ${orderId8} оплачен — Whale Abyss`,
    html: orderPaidEmail({
      orderId8,
      items: data.items,
      total: data.totalAmount,
      date: data.orderDate,
    }),
  });
}

export async function sendOrderCompletedEmail(
  to: string,
  data: Pick<OrderEmailData, 'orderId' | 'items'>
): Promise<void> {
  const orderId8 = data.orderId.slice(0, 8).toUpperCase();
  await sendEmail({
    to,
    subject: `🎉 Заказ ${orderId8} выполнен — Whale Abyss`,
    html: orderCompletedEmail({ orderId8, items: data.items }),
  });
}
