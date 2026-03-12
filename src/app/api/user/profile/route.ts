import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/user/profile - fetch profile
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;

  try {
    await connectDB();
    const user = await User.findById(userId).select("-password").lean();
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[profile GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/user/profile - update profile
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id?: string }).id;

  try {
    const body = await req.json();
    const allowed: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) allowed.name = body.name.trim();
    if (typeof body.image === "string") allowed.image = body.image;
    if (body.weightUnit === "kg" || body.weightUnit === "lbs") allowed.weightUnit = body.weightUnit;

    await connectDB();
    const user = await User.findByIdAndUpdate(userId, allowed, { new: true }).select("-password").lean();
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[profile PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
