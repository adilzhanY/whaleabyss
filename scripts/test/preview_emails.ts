/**
 * Renders every email template with fixture data for visual review, and can
 * send real copies through the live transporter.
 *
 *   npx tsx scripts/test/preview_emails.ts [outDir]      # write HTML files
 *   SEND=1 TEST_EMAIL_TO=you@x npx tsx scripts/test/preview_emails.ts
 */
import 'dotenv/config'; // plain tsx run — Next isn't here to load .env
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  otpEmail,
  passwordResetEmail,
  orderPaidEmail,
  orderCompletedEmail,
} from '../../lib/emailTemplates';

const FIXTURE_ITEMS = [
  { title: 'Энканомия 100%', quantity: 1, price: 1200 },
  { title: 'Энканомия: все квесты', quantity: 1, price: 1200 },
  { title: 'Нод-Край 6.7', quantity: 2, price: 750 },
];

const templates: Record<string, { subject: string; html: string }> = {
  'otp': {
    subject: 'Ваш код подтверждения — Whale Abyss',
    html: otpEmail({ code: '482913', username: 'Nataly' }),
  },
  'password-reset': {
    subject: 'Сброс пароля — Whale Abyss',
    html: passwordResetEmail({ url: 'https://whaleabyss.ru/reset-password?token=example-token-1234' }),
  },
  'order-paid': {
    subject: '✅ Заказ A4A42B12 оплачен — Whale Abyss',
    html: orderPaidEmail({ orderId8: 'A4A42B12', items: FIXTURE_ITEMS, total: 3900, date: new Date() }),
  },
  'order-completed': {
    subject: '🎉 Заказ A4A42B12 выполнен — Whale Abyss',
    html: orderCompletedEmail({ orderId8: 'A4A42B12', items: FIXTURE_ITEMS }),
  },
};

const outDir = process.argv[2] ?? join(process.cwd(), '.email-previews');
mkdirSync(outDir, { recursive: true });
for (const [name, t] of Object.entries(templates)) {
  writeFileSync(join(outDir, `${name}.html`), t.html);
  console.log(`wrote ${join(outDir, `${name}.html`)}`);
}

async function sendAll() {
  const to = process.env.TEST_EMAIL_TO;
  if (!to) {
    console.error('SEND=1 requires TEST_EMAIL_TO');
    process.exit(1);
  }
  const { sendEmail } = await import('../../lib/email');
  for (const [name, t] of Object.entries(templates)) {
    await sendEmail({ to, subject: `[preview:${name}] ${t.subject}`, html: t.html });
    console.log(`sent ${name} -> ${to}`);
  }
}

if (process.env.SEND === '1') {
  sendAll().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
