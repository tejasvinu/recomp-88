import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findOne: vi.fn(), findOneAndUpdate: vi.fn(), create: vi.fn(), cookie: vi.fn(), config: null as unknown }));
vi.mock("next-auth", () => ({ default: (config: unknown) => { mocks.config = config; return {}; } }));
vi.mock("@/lib/mongodb", () => ({ connectDB: async () => true }));
vi.mock("@/models/User", () => ({ default: mocks }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mocks.cookie, delete: vi.fn() }) }));

process.env.AUTH_SECRET = "fake-local-test-secret-with-no-real-credentials";
await import("./auth");
const config = mocks.config as { callbacks: { signIn: (args: unknown) => Promise<boolean> } };
const login = (verified = true, subject = "subject-1") => config.callbacks.signIn({
  user: { email: "victim@example.test" },
  account: { provider: "google", providerAccountId: subject },
  profile: { email_verified: verified, sub: subject },
});
const { signGoogleLink, verifyGoogleLink } = await import("./lib/googleLink");

describe("Google identity binding", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each([[], ["credentials"], ["credentials", "google"]].map(p => [p]))("refuses unbound password account %j", async (providers) => {
    const save = vi.fn();
    mocks.findOne.mockResolvedValue({ password: "hash", providers, save });
    expect(await login()).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });
  it("requires a verified Google email", async () => {
    mocks.findOne.mockResolvedValue(null);
    expect(await login(false)).toBe(false);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("refuses another Google subject even with the same email", async () => {
    mocks.findOne.mockResolvedValue({ googleAccountId: "subject-2", providers: ["google"], save: vi.fn() });
    expect(await login()).toBe(false);
  });
  it("accepts an already bound identity", async () => {
    mocks.findOne.mockResolvedValue({ password: "hash", googleAccountId: "subject-1", providers: ["google"], save: vi.fn() });
    expect(await login()).toBe(true);
  });
  it("links only with a valid owner-bound single-use reauthentication proof", async () => {
    mocks.findOne.mockResolvedValue({ _id: "owner-1", password: "hash", providers: ["credentials"] });
    mocks.cookie.mockReturnValue({ value: signGoogleLink("owner-1", "nonce", Date.now() + 60_000) });
    mocks.findOneAndUpdate.mockResolvedValue({ _id: "owner-1" });
    expect(await login()).toBe(true);
    expect(mocks.findOneAndUpdate.mock.calls[0][0]).toMatchObject({ _id: "owner-1", googleLinkNonce: "nonce", password: "hash" });
    mocks.findOneAndUpdate.mockResolvedValue(null);
    expect(await login()).toBe(false);
    mocks.cookie.mockReturnValue({ value: signGoogleLink("owner-2", "nonce", Date.now() + 60_000) });
    expect(await login()).toBe(false);
  });
  it("rejects expired or modified reauthentication tickets", () => {
    expect(verifyGoogleLink(signGoogleLink("a", "n", 0))).toBeNull();
    expect(verifyGoogleLink(signGoogleLink("a", "n", Date.now() + 60_000) + "bad")).toBeNull();
  });
});

