import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { AuthOptions } from "next-auth";
import { getAuthSecret } from "@/lib/auth/secret";
import { checkRateLimit, recordRateLimitHit, resetRateLimit, getClientIp } from "@/lib/rateLimit";

// Brute-force protection: count only FAILED attempts and forgive them on a
// successful login, so a legit user fumbling their password is never locked out.
// Limit per (ip + account) for targeted guessing and per ip for spray attacks.
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_PER_ACCOUNT = 8;
const LOGIN_MAX_PER_IP = 30;

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const ip = getClientIp(req?.headers);
        const email = credentials.email.toLowerCase().trim();
        const accountKey = `login:${ip}:${email}`;
        const ipKey = `login:ip:${ip}`;

        // Reject early if recent failures are already over the limit. A stable
        // "RATE_LIMITED" code is thrown so the client can show a distinct
        // message without leaking whether the account exists.
        if (
          !checkRateLimit(accountKey, LOGIN_MAX_PER_ACCOUNT, LOGIN_WINDOW_MS).success ||
          !checkRateLimit(ipKey, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS).success
        ) {
          throw new Error("RATE_LIMITED");
        }

        const recordFailure = () => {
          recordRateLimitHit(accountKey, LOGIN_WINDOW_MS);
          recordRateLimitHit(ipKey, LOGIN_WINDOW_MS);
        };

        const userRecord = await db.select().from(users).where(eq(users.email, email)).limit(1);
        const user = userRecord[0];

        if (!user || !user.passwordHash) {
          recordFailure();
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isPasswordValid) {
          recordFailure();
          throw new Error("Invalid password");
        }

        // Successful login — forgive this account's prior failures from this IP.
        resetRateLimit(accountKey);

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          image: user.avatarUrl,
          role: user.role ?? 'user',
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session?.image) token.image = session.image;
        if (session?.name) token.name = session.name;
      }
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.image = user.image;
        // @ts-ignore - augmented in types/next-auth.d.ts
        token.role = user.role ?? 'user';
      }

      // Refresh role on every request so admin promotion/demotion takes
      // effect without the user re-logging in (e.g. linking a booster
      // account must grant /portal access on the next session refresh).
      if (token.id && !user) {
        const dbUser = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (dbUser[0]) token.role = dbUser[0].role ?? 'user';
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.image = token.image as string | null | undefined;
        // @ts-ignore
        session.user.role = (token.role as string) ?? 'user';
      }
      return session;
    }
  },
  secret: getAuthSecret(),
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };