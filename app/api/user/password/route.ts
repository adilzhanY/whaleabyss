import { NextResponse, type NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import bcrypt from "bcrypt";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { enforceRateLimit, RATE_TIERS } from "@/lib/apiRateLimit";
import { firstError, passwordSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

/**
 * Change (or, for OAuth-created accounts, set for the first time) the password
 * of the signed-in user.
 *
 * Until now the only way to get a password was the forgot-password email flow,
 * so a Yandex-signed-in customer had no way to add one and a password user had
 * to log out to change theirs.
 *
 * `passwordHash IS NULL` means the account was created through Yandex and has
 * no password yet — there is nothing to verify, and the live session is the
 * proof of identity. When a hash exists the current password is mandatory, so
 * a hijacked-but-unattended session can't silently lock the owner out.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = enforceRateLimit(req, "user:password", RATE_TIERS.auth, session.user.id);
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    const invalid = firstError(passwordSchema, newPassword);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const [user] = await db
      .select({ id: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, session.user.id));

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Введите текущий пароль" }, { status: 400 });
      }
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });
      }
      if (currentPassword === newPassword) {
        return NextResponse.json(
          { error: "Новый пароль совпадает с текущим" },
          { status: 400 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, hasPassword: true });
  } catch (error) {
    console.error("Password change error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
