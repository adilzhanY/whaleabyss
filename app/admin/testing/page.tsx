import { db } from "@/lib/db";
import { services } from "@/lib/schema";
import { eq } from "drizzle-orm";
import TestingClient from "./TestingClient";

export const dynamic = "force-dynamic";

export default async function AdminTestingPage() {
  const testServices = await db
    .select()
    .from(services)
    .where(eq(services.isTestService, true));

  return <TestingClient services={testServices} />;
}
