import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
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
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const db = await connectDB();
          if (!db) return false; // Prevent sign-in to avoid orphaned tokens and future CastErrors
          const existing = await User.findOne({ email: user.email!.toLowerCase() });
          if (!existing) {
            await User.create({
              name: user.name ?? "User",
              email: user.email!.toLowerCase(),
              image: user.image ?? undefined,
            });
          } else if (user.image && !existing.image) {
            existing.image = user.image;
            await existing.save();
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
