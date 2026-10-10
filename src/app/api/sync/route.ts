import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import { hasRemoteChangesSinceBase, sanitizeSyncPayload } from "@/lib/sync";
import { emptySnapshot, mergeLedgerSnapshot, stripSyncMetadata } from "@/lib/syncLedger";
import User from "@/models/User";
import UserData from "@/models/UserData";
import type { AppDataSnapshot } from "@/types";

function storedSnapshot(value: unknown): AppDataSnapshot {
  const payload = sanitizeSyncPayload(value) ?? {};
  const defaults = emptySnapshot();
  return stripSyncMetadata({ ...defaults, ...payload, settings: { ...defaults.settings, ...payload.settings } });
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    if (!(await connectDB())) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    const data = await UserData.findOne({ userId }).lean();
    return NextResponse.json({ accountId: userId, data: data ? { ...storedSnapshot(data), revision: data.revision ?? 0, lastSyncedAt: data.lastSyncedAt ?? null } : null }, { headers: { "Cache-Control": "no-store" } });
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
    if (payload.accountId !== undefined && payload.accountId !== userId) return NextResponse.json({ error: "account_changed" }, { status: 403 });
    if (!(await connectDB())) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await UserData.findOne({ userId }).lean();
      const revision = existing?.revision ?? 0;
      if (Object.keys(payload).every(k => ["accountId", "baseLastSyncedAt", "lastSyncedAt", "baseRevision"].includes(k))) {
        return NextResponse.json({ ok: true, noOp: true, revision, lastSyncedAt: existing?.lastSyncedAt ?? null });
      }
      const preferIncoming = payload.baseRevision !== undefined ? payload.baseRevision === revision :
        !hasRemoteChangesSinceBase(payload.baseLastSyncedAt, existing?.lastSyncedAt);
      const merged = mergeLedgerSnapshot(storedSnapshot(existing), payload, preferIncoming);
      const fields = { ...merged, revision: revision + 1, lastSyncedAt: new Date() };
      let updated;
      if (!existing) {
        try { updated = await UserData.create({ userId, ...fields }); }
        catch (error) {
          if ((error as { code?: number }).code === 11000) continue;
          throw error;
        }
      } else {
        const filter = revision === 0 ? { userId, $or: [{ revision: 0 }, { revision: { $exists: false } }] } : { userId, revision };
        updated = await UserData.findOneAndUpdate(filter, { $set: fields }, { new: true, runValidators: true });
        if (!updated) continue;
      }
      await User.findByIdAndUpdate(userId, { weightUnit: merged.settings.weightUnit }).catch(() => {});
      return NextResponse.json({ ok: true, revision: updated.revision, lastSyncedAt: updated.lastSyncedAt,
        data: { ...storedSnapshot(updated.toObject()), revision: updated.revision, lastSyncedAt: updated.lastSyncedAt } }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "revision_conflict", message: "Retry after fetching the current snapshot" }, { status: 409 });
  } catch (error) {
    if (error instanceof Error && error.message === "reset_conflict") return NextResponse.json({ error: "reset_conflict", message: "Fetch the current reset generation before uploading" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
