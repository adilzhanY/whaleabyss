// E2E check of the exactly-once completed-email claim: re-arm one test
// order's flag, then invoke the claim helper 3x CONCURRENTLY. Expect exactly
// one send (one "[Email] ..." log line) and the flag set afterwards.
import 'dotenv/config';
import { db } from '../../lib/db';
import { orders } from '../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { claimAndSendCompletedEmail } from '../../lib/orderEmails';

async function main() {
  const id = process.argv[2];
  if (!id) throw new Error('usage: tsx test_email_claim.ts <orderId>');

  await db.update(orders).set({ completedEmailSentAt: sql`NULL` }).where(eq(orders.id, id));
  console.log('re-armed');
  await Promise.all([
    claimAndSendCompletedEmail(id),
    claimAndSendCompletedEmail(id),
    claimAndSendCompletedEmail(id),
  ]);
  const [row] = await db.select({ flag: orders.completedEmailSentAt }).from(orders).where(eq(orders.id, id));
  console.log('flag after:', row.flag ? 'SET' : 'NULL');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
