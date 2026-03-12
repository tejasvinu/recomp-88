import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import UserData from "@/models/UserData";

// GET /api/sync - fetch user cloud data
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  try {
    await connectDB();
    const data = await UserData.findOne({ userId }).lean();
    return NextResponse.json({ data: data ?? null });
  } catch (err) {
    console.error("[sync GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/sync - save/merge user cloud data
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  try {
    const body = await req.json();
    await connectDB();

    const updated = await UserData.findOneAndUpdate(
      { userId },
      {
        userId,
        workoutTemplate: body.workoutTemplate ?? [],
        progress: body.progress ?? {},
        sessions: body.sessions ?? [],
        bodyWeightEntries: body.bodyWeightEntries ?? [],
        exerciseNotes: body.exerciseNotes ?? {},
        settings: body.settings ?? {},
        lastSyncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true, lastSyncedAt: updated.lastSyncedAt });
  } catch (err) {
    console.error("[sync POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
