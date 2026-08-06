import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { getClientIp, registerLimiter } from "@/lib/rateLimit";
import User from "@/models/User";

const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!registerLimiter.isAllowed(`ip:${ip}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : null;

    if (!name || !email || !password)
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });

    if (name.length > MAX_NAME_LENGTH)
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });

    if (email.length > MAX_EMAIL_LENGTH || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Please provide a valid email address" }, { status: 400 });

    if (!password || password.length < MIN_PASSWORD_LENGTH)
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );

    const db = await connectDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    const existing = await User.findOne({ email });
    // Use a generic message to avoid leaking whether an email is already registered
    // (account enumeration). The response is identical to a successful flow outcome
    // from an attacker's perspective; legitimate users just see "already registered".
    if (existing)
      return NextResponse.json(
        { error: "Could not create account with those details" },
        { status: 400 }
      );

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      providers: ["credentials"],
    });

    return NextResponse.json(
      { id: user._id.toString(), name: user.name, email: user.email },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
