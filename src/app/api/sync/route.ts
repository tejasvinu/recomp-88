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

    const existing = await UserData.findOne({ userId });

    const mergeById = <T extends { id: string }>(local: T[], cloud: T[]): T[] => {
      const merged = new Map<string, T>();
      [...cloud, ...local].forEach((item) => {
        if (item?.id) merged.set(item.id, item);
      });
      return Array.from(merged.values());
    };

    const mergeByDate = <T extends { date: string }>(local: T[], cloud: T[]): T[] => {
      const merged = new Map<string, T>();
      [...cloud, ...local].forEach((item) => {
        if (item?.date) merged.set(item.date, item);
      });
      return Array.from(merged.values());
    };

    const workoutTemplate = body.workoutTemplate ?? existing?.workoutTemplate ?? [];
    const progress = { ...(existing?.progress ?? {}), ...(body.progress ?? {}) };
    const sessions = mergeById(body.sessions ?? [], existing?.sessions ?? []);
    const bodyWeightEntries = mergeByDate(body.bodyWeightEntries ?? [], existing?.bodyWeightEntries ?? []);
    const exerciseNotes = { ...(existing?.exerciseNotes ?? {}), ...(body.exerciseNotes ?? {}) };
    const settings = { ...(existing?.settings ?? {}), ...(body.settings ?? {}) };
    const customExercises = mergeById(body.customExercises ?? [], existing?.customExercises ?? []);

    const updated = await UserData.findOneAndUpdate(
      { userId },
      {
        userId,
        workoutTemplate,
        progress,
        sessions,
        bodyWeightEntries,
        exerciseNotes,
        settings,
        customExercises,
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
