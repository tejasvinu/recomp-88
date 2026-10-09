import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { hasRemoteChangesSinceBase, sanitizeSyncPayload } from "@/lib/sync";
import { emptySnapshot, mergeLedgerSnapshot } from "@/lib/syncLedger";
import User from "@/models/User";
import UserData from "@/models/UserData";
import type { AppDataSnapshot } from "@/types";

export function storedSnapshot(value: unknown): AppDataSnapshot {
  const payload = sanitizeSyncPayload(value) ?? {};
  const defaults = emptySnapshot();
  return { ...defaults, ...payload, settings: { ...defaults.settings, ...payload.settings } };
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!(await connectDB())) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const data = await UserData.findOne({ userId }).lean();
    return NextResponse.json({ data: data ? { ...storedSnapshot(data), lastSyncedAt: data.lastSyncedAt ?? null } : null }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }); }
  try {
    const payload = sanitizeSyncPayload(body);
    if (!payload) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    if (!(await connectDB())) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const existing = await UserData.findOne({ userId }).lean();
    if (Object.keys(payload).every(k => k === "baseLastSyncedAt" || k === "lastSyncedAt")) {
      return NextResponse.json({ ok: true, noOp: true, lastSyncedAt: existing?.lastSyncedAt ?? null });
    }
    const merged = mergeLedgerSnapshot(storedSnapshot(existing), payload,
      !hasRemoteChangesSinceBase(payload.baseLastSyncedAt, existing?.lastSyncedAt));
    const updated = await UserData.findOneAndUpdate({ userId }, { $set: { ...merged, lastSyncedAt: new Date() } }, { upsert: true, new: true, runValidators: true });
    await User.findByIdAndUpdate(userId, { weightUnit: merged.settings.weightUnit }).catch(() => {});
    return NextResponse.json({ ok: true, lastSyncedAt: updated.lastSyncedAt, data: { ...storedSnapshot(updated.toObject()), lastSyncedAt: updated.lastSyncedAt } });
  } catch (error) {
    if (error instanceof Error && error.message === "reset_conflict") return NextResponse.json({ error: "reset_conflict", message: "Fetch the current reset generation before uploading" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
