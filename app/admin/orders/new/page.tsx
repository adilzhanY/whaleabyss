import { db } from "@/lib/db";
import { users, services } from "@/lib/schema";
import { asc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/lib/auth/requireAdmin";
import ManualOrderForm from "./ManualOrderForm";

export const dynamic = "force-dynamic";

export default async function NewManualOrderPage({
  searchParams,
}: {
  // `?userId=` is how the user card's «Заказ вручную» button pre-selects the
  // customer. Resolved on the server so the form gets it on the first render.
  searchParams: Promise<{ userId?: string }>;
}) {
  await requireAdminPage();
  const { userId } = await searchParams;

  const userList = await db
    .select({ id: users.id, username: users.username, email: users.email })
    .from(users)
    .orderBy(asc(users.username));

  const serviceList = await db
    .select({ id: services.id, title: services.title, price: services.price })
    .from(services)
    .where(eq(services.isTestService, false))
    .orderBy(asc(services.title));

  return (
    <ManualOrderForm
      users={userList}
      services={serviceList}
      initialUserId={userId ?? null}
    />
  );
}
