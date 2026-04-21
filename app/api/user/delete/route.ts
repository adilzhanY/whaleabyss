import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session?.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session?.user as any).id;

    // Delete user from db
    // Since order_items uses ON DELETE CASCADE on service_id/order_id but what about user orders?
    // In schema.ts: orders has userId: references(() => users.id, { onDelete: 'set null' })
    // If you prefer to cascade delete orders, you would change schema. But wait, we just delete the user.
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ message: "Account deleted" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete account error:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
