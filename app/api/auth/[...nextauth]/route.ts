import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import YandexProvider from "next-auth/providers/yandex";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { AuthOptions } from "next-auth";
import { getAuthSecret } from "@/lib/auth/secret";
import { getOrCreateUserFromYandex, type YandexProfile } from "@/lib/oauthUser";
import { checkRateLimit, recordRateLimitHit, resetRateLimit, getClientIp } from "@/lib/rateLimit";
import { normalizeEmail } from "@/lib/normalizeEmail";

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
        const email = normalizeEmail(credentials.email);
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
    }),
    // «Войти с Яндексом». No NextAuth adapter — the signIn callback below maps
    // the Yandex identity onto our own users/oauth_accounts tables and rewrites
    // `user` to the local row, so the jwt/session callbacks work unchanged.
    YandexProvider({
      clientId: process.env.YANDEX_CLIENT_ID ?? "",
      clientSecret: process.env.YANDEX_CLIENT_SECRET ?? "",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  // OAuth failures (denied consent, provider errors) land back on the homepage
  // instead of NextAuth's default English error page.
  pages: {
    error: "/",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "yandex") return true;
      const dbUser = await getOrCreateUserFromYandex(profile as unknown as YandexProfile);
      // No email from Yandex → we can't provision an account (email is the
      // primary identity for orders/receipts). Deny; user lands on "/".
      if (!dbUser) return false;
      // Replace provider identity with our local one so the jwt callback's
      // `if (user)` branch stores the DB uuid + role in the token.
      user.id = dbUser.id;
      user.name = dbUser.username;
      user.email = dbUser.email;
      user.image = dbUser.avatarUrl;
      user.role = dbUser.role ?? "user";
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.image = user.image;
        token.role = user.role ?? 'user';
      }

      // The token is a CACHE of the users row, not a second source of truth.
      // Re-read every mutable identity field on each request so nothing that
      // renders from `useSession()` (the header avatar + name) can disagree
      // with the DB: role, so admin/booster promotion takes effect without
      // re-logging in; avatar + username, because they are edited on /profile
      // and the client `update()` below is only an optimistic nudge — if it
      // never lands (failed POST, a race with a concurrent session refetch, or
      // the change was made in another browser) the old value used to stay in
      // the token until it expired, leaving a stale avatar in the header while
      // /profile showed the new one. One query, same as before.
      if (token.id && !user) {
        const dbUser = await db
          .select({ role: users.role, username: users.username, avatarUrl: users.avatarUrl })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);
        if (dbUser[0]) {
          token.role = dbUser[0].role ?? 'user';
          token.name = dbUser[0].username;
          token.image = dbUser[0].avatarUrl;
        }
      }

      // Applied last so an explicit client update wins over the row just read:
      // the profile writes the DB before calling update(), so they agree, but
      // this ordering keeps the optimistic value if a read ever lags behind.
      if (trigger === "update") {
        if (session?.image) token.image = session.image;
        if (session?.name) token.name = session.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.image = token.image as string | null | undefined;
        session.user.role = token.role ?? 'user';
      }
      return session;
    }
  },
  secret: getAuthSecret(),
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };