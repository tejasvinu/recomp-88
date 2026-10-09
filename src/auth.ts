import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { getClientIp, signInLimiter } from "@/lib/rateLimit";
import User from "@/models/User";
import { cookies } from "next/headers";
import { GOOGLE_LINK_COOKIE, verifyGoogleLink } from "@/lib/googleLink";

// ─── AUTH_SECRET hardening ───────────────────────────────────────────────
// Fail fast so a weak/predictable JWT secret is never accepted in production.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET is required. Add it to your environment variables.");
}
const trimmedSecret = process.env.AUTH_SECRET.trim();
const weakSecret =
  trimmedSecret.length < 16 ||
  /^(replace-me|changeme|your-secret|example|secret|s3cret)$/i.test(trimmedSecret) ||
  /^(replace-me-|changeme-|your-secret-|example-)/i.test(trimmedSecret);
if (weakSecret && process.env.NODE_ENV === "production" && !isBuildPhase) {
  throw new Error(
    "AUTH_SECRET is too weak or a placeholder. Generate a strong one with: openssl rand -base64 32"
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate-limit credential attempts per (IP + email) to blunt brute force.
        const headers =
          request && typeof request === "object" && "headers" in request
            ? (request.headers as Headers | undefined)
            : undefined;
        const key = `${getClientIp(headers)}:${(
          credentials.email as string
        ).toLowerCase()}`;
        if (!signInLimiter.isAllowed(key)) return null;

        try {
          const db = await connectDB();
          if (!db) return null;
          const user = await User.findOne({ email: (credentials.email as string).toLowerCase() });
          if (!user || !user.password) return null;
          const valid = await bcrypt.compare(credentials.password as string, user.password);
          if (!valid) return null;
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (profile?.email_verified !== true || !user.email || !account.providerAccountId) return false;
        try {
          const db = await connectDB();
          if (!db) return false; // Prevent sign-in to avoid orphaned tokens and future CastErrors
          const existing = await User.findOne({ email: user.email!.toLowerCase() });
          if (existing) {
            // Security: never silently bind a Google identity onto an existing
            // account that was created with credentials unless that account has
            // already opted into Google. This prevents cross-provider account
            // merging without the owner's consent.
            const providers = existing.providers ?? [];
            const linkedGoogle = providers.includes("google");
            if (existing.googleAccountId && existing.googleAccountId !== account.providerAccountId) return false;
            if (existing.password && !existing.googleAccountId) {
              const jar = await cookies();
              const ticket = verifyGoogleLink(jar.get(GOOGLE_LINK_COOKIE)?.value);
              if (!ticket || ticket.userId !== existing._id.toString()) return false;
              const linked = await User.findOneAndUpdate({
                _id: existing._id, password: existing.password, googleLinkNonce: ticket.nonce,
                googleLinkExpiresAt: { $gt: new Date() }, googleAccountId: { $exists: false },
              }, { $set: { googleAccountId: account.providerAccountId }, $addToSet: { providers: "google" },
                $unset: { googleLinkNonce: "", googleLinkExpiresAt: "" } });
              jar.delete(GOOGLE_LINK_COOKIE);
              return !!linked;
            }
            existing.googleAccountId = account.providerAccountId;

            if (!linkedGoogle) {
              providers.push("google");
              existing.providers = providers;
            }
            if (user.image && !existing.image) existing.image = user.image;
            await existing.save();
          } else {
            await User.create({
              name: user.name ?? "User",
              email: user.email!.toLowerCase(),
              image: user.image ?? undefined,
              providers: ["google"],
              googleAccountId: account.providerAccountId,
            });
          }
        } catch {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: enrich the token with the DB user id
        try {
          const db = await connectDB();
          if (db) {
            const dbUser = await User.findOne({ email: user.email!.toLowerCase() });
            if (dbUser) token.id = dbUser._id.toString();
          }
        } catch {
          // Prevent fallback to raw string ID to avoid Mongoose CastError on sync
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
});
