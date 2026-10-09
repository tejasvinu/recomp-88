import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateApiToken, hashApiToken, parseBearerToken } from "@/lib/tokenUtils";

describe("API token secrets", () => {
  it("generates distinct tokens with 32 random bytes and an eight-character display prefix", () => {
    const first = generateApiToken();
    const second = generateApiToken();
    expect(first.token).toMatch(/^rcp_[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(first.token.slice(4), "base64url")).toHaveLength(32);
    expect(second.token).not.toBe(first.token);
    expect(first.prefix).toBe(first.token.slice(4, 12));
    expect(first.prefix).toHaveLength(8);
    expect(first.tokenHash).toBe(createHash("sha256").update(first.token).digest("hex"));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("hashes the full token, including rcp_", () => {
    const token = `rcp_${"a".repeat(43)}`;
    expect(hashApiToken(token)).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hashApiToken(token)).not.toBe(hashApiToken(token.slice(4)));
  });
});

describe("bearer parsing", () => {
  const token = generateApiToken().token;
  it.each([`Bearer ${token}`, `bearer ${token}`, ` BEARER\t${token} `])("accepts a bearer authorization header", (value) => {
    expect(parseBearerToken(value)).toBe(token);
  });
  it.each([null, "", token, `Basic ${token}`, `Bearer ${token} extra`, `Bearer ${token},${token}`, "Bearer rcp_short", `Bearer RCP_${"a".repeat(43)}`, `Bearer rcp_${"+".repeat(43)}`, `Bearer rcp_${"a".repeat(44)}`])("rejects malformed or missing authorization: %s", (value) => {
    expect(parseBearerToken(value)).toBeNull();
  });
});
