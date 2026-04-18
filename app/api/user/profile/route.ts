import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [user] = await db
      .select({
        username: users.username,
        email: users.email,
        receiptEmail: users.receiptEmail,
        telegramUsername: users.telegramUsername,
        gameUsername: users.gameUsername,
      })
      .from(users)
      .where(eq(users.email, session.user.email));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, receiptEmail, telegramUsername, gameUsername } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    const updateData: Partial<{
      username: string;
      receiptEmail: string | null;
      telegramUsername: string | null;
      gameUsername: string | null;
    }> = { username: name };

    if (receiptEmail !== undefined) updateData.receiptEmail = receiptEmail;
    if (telegramUsername !== undefined) updateData.telegramUsername = telegramUsername;
    if (gameUsername !== undefined) updateData.gameUsername = gameUsername;

    // Update the user details in the database
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.email, session.user.email));

    return NextResponse.json({ success: true, name, receiptEmail, telegramUsername, gameUsername });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
