import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { GOOGLE_LINK_COOKIE, signGoogleLink } from "@/lib/googleLink";
import { signInLimiter } from "@/lib/rateLimit";
import User from "@/models/User";

// A short-lived, single-use proof of password reauthentication. NextAuth still
// verifies OAuth state/PKCE and the Google subject on the subsequent callback.
export async function POST(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!signInLimiter.isAllowed(`google-link:${userId}`)) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  try {
    const body = await req.json();
    if (typeof body.password !== "string" || body.password.length > 1024) return NextResponse.json({ error: "Password required" }, { status: 400 });
    if (!(await connectDB())) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const user = await User.findById(userId);
    if (!user?.password || !(await bcrypt.compare(body.password, user.password))) return NextResponse.json({ error: "Reauthentication failed" }, { status: 401 });
    const nonce = randomBytes(32).toString("base64url");
    const expires = Date.now() + 5 * 60_000;
    await User.updateOne({ _id: userId, password: user.password }, { $set: { googleLinkNonce: nonce, googleLinkExpiresAt: new Date(expires) } });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(GOOGLE_LINK_COOKIE, signGoogleLink(userId, nonce, expires), {
      httpOnly: true, secure: new URL(req.url).protocol === "https:", sameSite: "lax", path: "/", maxAge: 300,
    });
    return response;
  } catch { return NextResponse.json({ error: "Unable to prepare Google linking" }, { status: 400 }); }
}
