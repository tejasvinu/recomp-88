import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as training } from "./training/summary/route";
import { GET as sessions } from "./sessions/route";
import { GET as bodyWeight } from "./body-weight/route";
import { GET as me } from "./me/route";
import { apiJson } from "@/lib/apiResponse";
const mocks = vi.hoisted(() => ({ authenticate: vi.fn(), user: vi.fn(), data: vi.fn() }));
vi.mock("@/lib/apiTokens", () => ({ authenticateApiToken: mocks.authenticate }));
vi.mock("@/models/User", () => ({ default: { findById: mocks.user } }));
vi.mock("@/models/UserData", () => ({ default: { findOne: mocks.data } }));
const getters = [training, sessions, bodyWeight, me];
beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticate.mockResolvedValue({ userId: "owner" });
  mocks.user.mockReturnValue({ select: () => ({ lean: async () => ({ name: "Fixture Owner" }) }) });
  mocks.data.mockReturnValue({ select: () => ({ lean: async () => ({ revision: 3, sessions: [], bodyWeightEntries: [], settings: { timezone: "Asia/Kolkata" }, exerciseNotes: { private: "never expose" }, progress: { private: "never expose" } }) }) });
});
describe("read-only owner-scoped v2 routes", () => {
  it("uses the existing token scope and exposes no private snapshot fields", async () => {
    for (const get of getters) {
      const response = await get(new Request("http://localhost/api/v2/training/summary?from=2026-10-09&to=2026-10-09"));
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const json = await response.json();
      expect(json).toMatchObject({ schemaVersion: 2, revision: 3 });
      expect(JSON.stringify(json)).not.toContain("never expose");
    }
    expect(mocks.authenticate).toHaveBeenCalledWith(expect.any(Request), "read:workouts");
    expect(mocks.data).toHaveBeenCalledWith({ userId: "owner" });
    expect(mocks.user).toHaveBeenCalledWith("owner");
  });
  it.each([401, 429, 503])("preserves authentication failure %s", async status => {
    mocks.authenticate.mockResolvedValue(apiJson({ error: "Unavailable" }, status));
    for (const get of getters) expect((await get(new Request("http://localhost/api/v2/me"))).status).toBe(status);
    expect(mocks.data).not.toHaveBeenCalled();
  });
  it("returns safe typed validation errors", async () => {
    const response = await training(new Request("http://localhost/api/v2/training/summary?from=2026-02-30"));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_date", retryable: false } });
  });
  it("returns 401 for a deleted account and 503 for failed data reads", async () => {
    mocks.user.mockReturnValue({ select: () => ({ lean: async () => null }) });
    expect((await training(new Request("http://localhost/api/v2/training/summary"))).status).toBe(401);
    mocks.data.mockImplementation(() => { throw new Error("private DB detail"); });
    const response = await training(new Request("http://localhost/api/v2/training/summary"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private DB detail");
  });
});
