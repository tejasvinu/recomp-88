import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import {
  hasRemoteChangesSinceBase,
  mergeBodyWeightEntries,
  mergeById,
  mergeExerciseNotes,
  mergeSessionHistory,
  mergeSettings,
  mergeWorkoutProgressWithPreference,
  sanitizeBodyWeightEntries,
  sanitizeCustomExercises,
  sanitizeExerciseNotes,
  sanitizeSessionHistory,
  sanitizeSettings,
  sanitizeSyncPayload,
  sanitizeWorkoutProgress,
} from "@/lib/sync";
import User from "@/models/User";
import UserData from "@/models/UserData";
import { normalizeWorkoutTemplate } from "@/data";

function payloadHasSyncFields(
  payload: Record<string, unknown>
): boolean {
  return (
    payload.workoutTemplate !== undefined ||
    payload.progress !== undefined ||
    payload.sessions !== undefined ||
    payload.bodyWeightEntries !== undefined ||
    payload.exerciseNotes !== undefined ||
    payload.settings !== undefined ||
    payload.customExercises !== undefined
  );
}

// GET /api/sync - fetch user cloud data
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "No user id" }, { status: 400 });

  try {
    const db = await connectDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const data = await UserData.findOne({ userId }).lean();
    if (!data) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({
      data: {
        workoutTemplate: normalizeWorkoutTemplate(data.workoutTemplate) ?? [],
        progress: sanitizeWorkoutProgress(data.progress),
        sessions: sanitizeSessionHistory(data.sessions),
        bodyWeightEntries: sanitizeBodyWeightEntries(data.bodyWeightEntries),
        exerciseNotes: sanitizeExerciseNotes(data.exerciseNotes),
        settings: sanitizeSettings(data.settings),
        customExercises: sanitizeCustomExercises(data.customExercises),
        lastSyncedAt: data.lastSyncedAt ?? null,
      },
    });
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

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    console.error("[sync POST] invalid json", err);
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  try {
    const payload = sanitizeSyncPayload(body);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const db = await connectDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

    if (!payloadHasSyncFields(payload as Record<string, unknown>)) {
      const existingOnly = await UserData.findOne({ userId }).lean();
      return NextResponse.json({
        ok: true,
        lastSyncedAt: existingOnly?.lastSyncedAt ?? null,
        noOp: true,
      });
    }

    const existing = await UserData.findOne({ userId });
    const remoteHasChanged = hasRemoteChangesSinceBase(
      payload.baseLastSyncedAt,
      existing?.lastSyncedAt ?? null
    );
    const preferIncomingOnConflict = !remoteHasChanged;

    const existingWorkoutTemplate = normalizeWorkoutTemplate(existing?.workoutTemplate) ?? [];
    const existingProgress = sanitizeWorkoutProgress(existing?.progress);
    const existingSessions = sanitizeSessionHistory(existing?.sessions);
    const existingBodyWeightEntries = sanitizeBodyWeightEntries(existing?.bodyWeightEntries);
    const existingExerciseNotes = sanitizeExerciseNotes(existing?.exerciseNotes);
    const existingSettings = sanitizeSettings(existing?.settings);
    const existingCustomExercises = sanitizeCustomExercises(existing?.customExercises);

    const workoutTemplate =
      payload.workoutTemplate
        ? preferIncomingOnConflict
          ? payload.workoutTemplate
          : existingWorkoutTemplate
        : existingWorkoutTemplate;
    const progress = mergeWorkoutProgressWithPreference(
      existingProgress,
      payload.progress ?? {},
      preferIncomingOnConflict
    );
    const sessions = mergeSessionHistory(
      existingSessions,
      payload.sessions ?? [],
      preferIncomingOnConflict
    );
    const bodyWeightEntries = mergeBodyWeightEntries(
      existingBodyWeightEntries,
      payload.bodyWeightEntries ?? [],
      preferIncomingOnConflict
    );
    const exerciseNotes = mergeExerciseNotes(
      existingExerciseNotes,
      payload.exerciseNotes ?? {},
      preferIncomingOnConflict
    );
    const settings = mergeSettings(
      existingSettings,
      payload.settings ?? {},
      preferIncomingOnConflict
    );
    const customExercises = mergeById(
      existingCustomExercises,
      payload.customExercises ?? [],
      preferIncomingOnConflict
    );

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
      { upsert: true, new: true, runValidators: true }
    );

    const wu = settings.weightUnit;
    if (wu === "kg" || wu === "lbs") {
      await User.findByIdAndUpdate(userId, { weightUnit: wu }).catch(() => {
        /* profile mirror is best-effort */
      });
    }

    return NextResponse.json({ ok: true, lastSyncedAt: updated.lastSyncedAt });
  } catch (err) {
    console.error("[sync POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
