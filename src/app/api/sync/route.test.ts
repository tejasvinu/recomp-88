import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { emptySnapshot } from "@/lib/syncLedger";
const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), create: vi.fn(), auth: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/mongodb", () => ({ connectDB: async () => true }));
vi.mock("@/models/User", () => ({ default: { findByIdAndUpdate: async () => {} } }));
vi.mock("@/models/UserData", () => ({ default: { findOne: () => ({ lean: mocks.read }), findOneAndUpdate: mocks.update, create: mocks.create } }));
const fixture = (id: string) => ({ id, version: 1, date: "2026-10-09T12:00:00Z", dayId: "d", dayName: "Push", exercises: [{ exerciseId: "e", name: "Press", type: "strength", sets: [{ setId: "s", loggedWeight: "40", loggedReps: "5", targetReps: "5", completed: true }] }] });
let db: Record<string, unknown>;
const request = (id: string) => new Request("http://localhost/api/sync", { method: "POST", body: JSON.stringify({ ...emptySnapshot(), sessions: [fixture(id)], baseRevision: 0 }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
  db = { ...emptySnapshot(), userId: "owner", revision: 0 };
  mocks.read.mockImplementation(async () => structuredClone(db));
  mocks.update.mockImplementation(async (filter, update) => {
    if (filter.revision !== undefined && filter.revision !== db.revision) return null;
    if (filter.$or && db.revision !== 0) return null;
    db = { ...db, ...update.$set };
    return { ...db, toObject: () => db };
  });
});
describe("atomic owner sync", () => {
  it("retries compare-and-swap so concurrent writers retain both sessions", async () => {
    const responses = await Promise.all([POST(request("a")), POST(request("b"))]);
    expect(responses.map(r => r.status)).toEqual([200, 200]);
    expect((db.sessions as { id: string }[]).map(s => s.id).sort()).toEqual(["a", "b"]);
    expect(db.revision).toBe(2);
  });
  it("returns a bounded conflict if every CAS fails", async () => {
    mocks.update.mockResolvedValue(null);
    expect((await POST(request("a"))).status).toBe(409);
    expect(mocks.update.mock.calls.length).toBeLessThanOrEqual(5);
  });
  it("retries a competing first insertion without overwriting it", async () => {
    mocks.read.mockResolvedValueOnce(null);
    mocks.create.mockImplementationOnce(async () => {
      db = { ...db, sessions: [fixture("first")], revision: 1 };
      throw Object.assign(new Error("duplicate"), { code: 11000 });
    });
    const res = await POST(request("second"));
    expect(res.status).toBe(200);
    expect((db.sessions as { id: string }[]).map(s => s.id).sort()).toEqual(["first", "second"]);
    expect(await res.json()).toMatchObject({ revision: 2, data: { revision: 2 } });
  });
  it("keeps the existing null-data contract for new accounts", async () => {
    mocks.read.mockResolvedValue(null);
    expect(await (await GET()).json()).toMatchObject({ data: null });
  });
  it("never accepts browser-less bearer access", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await POST(request("a"))).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("rejects a queued upload whose browser session changed accounts", async () => {
    const response = await POST(new Request("http://localhost/api/sync", { method: "POST", body: JSON.stringify({ ...emptySnapshot(), accountId: "previous-owner" }) }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "account_changed" });
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
