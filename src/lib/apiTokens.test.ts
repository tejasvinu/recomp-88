import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateApiToken } from "@/lib/apiTokens";
import { generateApiToken, hashApiToken } from "@/lib/tokenUtils";

const mocks = vi.hoisted(() => ({ connectDB: vi.fn(), findOne: vi.fn(), updateOne: vi.fn() }));
vi.mock("@/lib/mongodb", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/ApiToken", () => ({ default: { findOne: mocks.findOne, updateOne: mocks.updateOne } }));

const secret = generateApiToken().token;
const request = () => new Request("http://localhost/api/v1/me", { headers: { Authorization: `Bearer ${secret}` } });
const userId = "0123456789abcdef01234567";
let identity = 0;

function lookup(lastUsedAt: Date | null = null) {
  const token = { _id: `token-${identity++}`, userId, lastUsedAt };
  mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => token }) });
  return token;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connectDB.mockResolvedValue({});
  mocks.updateOne.mockResolvedValue({ modifiedCount: 1 });
  lookup();
});
afterEach(() => vi.useRealTimers());

describe("token authentication", () => {
  it("returns 401 with no-store without opening Mongo for a missing bearer token", async () => {
    const result = await authenticateApiToken(new Request("http://localhost/api/v1/me"), "read:workouts");
    expect(result).toBeInstanceOf(Response);
    const response = result as Response;
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toHaveProperty("error");
    expect(mocks.connectDB).not.toHaveBeenCalled();
  });
  it("looks up only the hash, required scope and unrevoked state", async () => {
    expect(await authenticateApiToken(request(), "read:workouts")).toEqual({ userId });
    expect(mocks.findOne).toHaveBeenCalledWith({ tokenHash: hashApiToken(secret), revokedAt: null, scopes: "read:workouts" });
    expect(mocks.updateOne).toHaveBeenCalledOnce();
  });
  it("returns 401 when the token is unknown, revoked or lacks scope", async () => {
    mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => null }) });
    const response = await authenticateApiToken(request(), "read:workouts") as Response;
    expect(response.status).toBe(401);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });
  it.each(["missing", "connection-error", "query-error"])("returns 503 if Mongo is unavailable: %s", async (failure) => {
    if (failure === "missing") mocks.connectDB.mockResolvedValue(null);
    if (failure === "connection-error") mocks.connectDB.mockRejectedValue(new Error("offline"));
    if (failure === "query-error") mocks.findOne.mockImplementation(() => { throw new Error("offline"); });
    const response = await authenticateApiToken(request(), "read:workouts") as Response;
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("throttles lastUsedAt writes and uses an atomic five-minute cutoff", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-10-09T12:00:00Z");
    vi.setSystemTime(now);
    lookup(new Date(now.getTime() - 299_999));
    await authenticateApiToken(request(), "read:workouts");
    expect(mocks.updateOne).not.toHaveBeenCalled();
    const token = lookup(new Date(now.getTime() - 300_000));
    await authenticateApiToken(request(), "read:workouts");
    expect(mocks.updateOne).toHaveBeenCalledWith({ _id: token._id, revokedAt: null, $or: [{ lastUsedAt: null }, { lastUsedAt: { $lte: new Date(now.getTime() - 300_000) } }] }, { $set: { lastUsedAt: now } });
  });
  it("keeps authentication working if usage tracking fails", async () => {
    mocks.updateOne.mockRejectedValue(new Error("offline"));
    expect(await authenticateApiToken(request(), "read:workouts")).toEqual({ userId });
  });
  it("limits each token to 60 requests a minute independently", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    const limited = lookup(new Date());
    for (let index = 0; index < 60; index++) expect(await authenticateApiToken(request(), "read:workouts")).toEqual({ userId });
    const response = await authenticateApiToken(request(), "read:workouts") as Response;
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    lookup(new Date());
    expect(await authenticateApiToken(request(), "read:workouts")).toEqual({ userId });
    vi.advanceTimersByTime(60_001);
    mocks.findOne.mockReturnValue({ select: () => ({ lean: async () => limited }) });
    expect(await authenticateApiToken(request(), "read:workouts")).toEqual({ userId });
  });
});
