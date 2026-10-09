import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getMe } from "./me/route";
import { GET as getSessions } from "./sessions/route";
import { apiJson } from "@/lib/apiResponse";

const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), user: vi.fn(), data: vi.fn() }));
vi.mock("@/lib/apiTokens", () => ({ authenticateApiToken: mocks.authenticate }));
vi.mock("@/models/User", () => ({ default: { findById: mocks.user } }));
vi.mock("@/models/UserData", () => ({ default: { findOne: mocks.data } }));
const userId = "0123456789abcdef01234567";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.authenticate.mockResolvedValue({ userId });
  mocks.user.mockReturnValue({ select: () => ({ lean: async () => ({ name: "Alex", weightUnit: "kg", email: "private" }) }) });
  mocks.data.mockReturnValue({ select: () => ({ lean: async () => ({ sessions: [], bodyWeightEntries: [], settings: { weightUnit: "lbs" }, lastSyncedAt: null, progress: { private: true }, exerciseNotes: { private: true } }) }) });
});

describe("v1 routes", () => {
  it("returns the exact me contract and scopes data queries to the token owner", async () => {
    const response = await getMe(new Request("http://localhost/api/v1/me"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ schemaVersion: 1, user: { name: "Alex" }, weightUnit: "lbs", lastSyncedAt: null, sessionCount: 0 });
    expect(mocks.user).toHaveBeenCalledWith(userId);
    expect(mocks.data).toHaveBeenCalledWith({ userId });
  });
  it("returns the exact sessions contract with normalized bounds", async () => {
    const response = await getSessions(new Request("http://localhost/api/v1/sessions?since=2026-10-01T00:00:00Z&until=2026-10-09T00:00:00Z"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ schemaVersion: 1, weightUnit: "lbs", since: "2026-10-01T00:00:00.000Z", until: "2026-10-09T00:00:00.000Z", sessions: [], bodyWeight: [] });
  });
  it("returns an uncached 400 for invalid bounds", async () => {
    const response = await getSessions(new Request("http://localhost/api/v1/sessions?since=bad"));
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it.each([401, 429, 503])("forwards authentication errors with status %s", async (status) => {
    mocks.authenticate.mockImplementation(async () => apiJson({ error: "Unavailable" }, status));
    for (const get of [getMe, getSessions]) {
      const response = await get(new Request("http://localhost/api/v1/me"));
      expect(response.status).toBe(status);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it("returns 503 for a failed database read and 401 for a deleted account", async () => {
    mocks.data.mockImplementation(() => { throw new Error("offline"); });
    expect((await getMe(new Request("http://localhost/api/v1/me"))).status).toBe(503);
    expect((await getSessions(new Request("http://localhost/api/v1/sessions"))).status).toBe(503);
    mocks.data.mockReturnValue({ select: () => ({ lean: async () => null }) });
    mocks.user.mockReturnValue({ select: () => ({ lean: async () => null }) });
    expect((await getMe(new Request("http://localhost/api/v1/me"))).status).toBe(401);
    expect((await getSessions(new Request("http://localhost/api/v1/sessions"))).status).toBe(401);
  });
});
