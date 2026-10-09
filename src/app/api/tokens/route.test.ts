import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { DELETE } from "./[id]/route";
import { hashApiToken } from "@/lib/tokenUtils";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), connectDB: vi.fn(), find: vi.fn(), init: vi.fn(), create: vi.fn(), findOneAndUpdate: vi.fn(), exists: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/mongodb", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/models/User", () => ({ default: { exists: mocks.exists } }));
vi.mock("@/models/ApiToken", () => ({ default: { find: mocks.find, init: mocks.init, create: mocks.create, findOneAndUpdate: mocks.findOneAndUpdate } }));

const userId = "0123456789abcdef01234567";
const tokenId = "abcdef0123456789abcdef01";
const createRequest = (body: unknown) => new Request("http://localhost/api/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: userId } });
  mocks.connectDB.mockResolvedValue({});
  mocks.exists.mockResolvedValue({ _id: userId });
  mocks.init.mockResolvedValue(undefined);
  const rows: Record<string, unknown>[] = [];
  mocks.find.mockImplementation(() => ({ select: () => ({ lean: async () => rows, sort: () => ({ lean: async () => rows }) }) }));
  mocks.create.mockImplementation(async (data) => ({ ...data, _id: tokenId, createdAt: new Date("2026-10-09T00:00:00Z") }));
  mocks.findOneAndUpdate.mockResolvedValue({ _id: tokenId });
});

describe("session-authenticated token management", () => {
  it.each([null, { user: {} }, { user: { id: "guest" } }])("rejects guests and sessions without a valid database identity", async (session) => {
    mocks.auth.mockResolvedValue(session);
    expect((await GET()).status).toBe(401);
    expect((await POST(createRequest({ name: "Atlas" }))).status).toBe(401);
    expect((await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tokenId }) })).status).toBe(401);
    expect(mocks.connectDB).not.toHaveBeenCalled();
  });
  it("lists only active owned tokens, omitting hashes and internal slots", async () => {
    const row = { _id: tokenId, name: "Atlas", prefix: "abcdefgh", scopes: ["read:workouts"], createdAt: new Date("2026-10-09T00:00:00Z"), lastUsedAt: null, tokenHash: "private", slot: 0, userId };
    mocks.find.mockReturnValue({ select: () => ({ sort: () => ({ lean: async () => [row] }) }) });
    const response = await GET();
    expect(mocks.find).toHaveBeenCalledWith({ userId, revokedAt: null });
    expect(await response.json()).toEqual({ tokens: [{ id: tokenId, name: "Atlas", prefix: "abcdefgh", scopes: ["read:workouts"], createdAt: "2026-10-09T00:00:00.000Z", lastUsedAt: null }] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("returns plaintext once at creation, while persisting only its hash", async () => {
    const response = await POST(createRequest({ name: "  Atlas  ", scopes: ["write:workouts"], userId: "another-user" }));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(Object.keys(body).sort()).toEqual(["createdAt", "id", "name", "prefix", "scopes", "token"]);
    expect(body.name).toBe("Atlas");
    expect(body.scopes).toEqual(["read:workouts"]);
    expect(mocks.create).toHaveBeenCalledWith({ userId, name: "Atlas", prefix: body.token.slice(4, 12), tokenHash: hashApiToken(body.token), scopes: ["read:workouts"], slot: 0 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([{}, { name: "" }, { name: "   " }, { name: "x".repeat(61) }, { name: 42 }, null])("validates the name before writing", async (body) => {
    expect((await POST(createRequest(body))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns 400 for malformed JSON", async () => {
    expect((await POST(new Request("http://localhost/api/tokens", { method: "POST", body: "{" }))).status).toBe(400);
  });
  it("limits concurrent creation to ten tokens and returns 409 for the eleventh", async () => {
    const active: Record<string, unknown>[] = [];
    mocks.find.mockImplementation(() => ({ select: () => ({ lean: async () => [...active] }) }));
    mocks.create.mockImplementation(async (data) => {
      if (active.some((token) => token.slot === data.slot)) throw { code: 11000 };
      const row = { ...data, _id: tokenId, createdAt: new Date() };
      active.push(row);
      return row;
    });
    const responses = await Promise.all(Array.from({ length: 11 }, (_, index) => POST(createRequest({ name: `App ${index}` }))));
    expect(responses.filter((response) => response.status === 201)).toHaveLength(10);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(1);
    expect(active).toHaveLength(10);
  });
  it("revokes only an active token owned by the caller", async () => {
    expect((await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tokenId }) })).status).toBe(200);
    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith({ _id: tokenId, userId, revokedAt: null }, { $set: { revokedAt: expect.any(Date) } });
    mocks.findOneAndUpdate.mockResolvedValue(null);
    expect((await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tokenId }) })).status).toBe(404);
    expect((await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "bad" }) })).status).toBe(404);
  });
  it("returns 503 for unavailable database", async () => {
    mocks.connectDB.mockResolvedValue(null);
    expect((await GET()).status).toBe(503);
    expect((await POST(createRequest({ name: "Atlas" }))).status).toBe(503);
    expect((await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: tokenId }) })).status).toBe(503);
  });
});
