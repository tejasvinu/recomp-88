import { describe, expect, it } from "vitest";
import { Types } from "mongoose";
import ApiToken from "./ApiToken";
import { generateApiToken } from "@/lib/tokenUtils";

describe("ApiToken schema", () => {
  const fields = () => ({ userId: new Types.ObjectId(), name: "  Atlas  ", ...generateApiToken(), slot: 0 });
  it("trims names, supplies dates and read scope, and drops plaintext", async () => {
    const token = new ApiToken(fields());
    await expect(token.validate()).resolves.toBeUndefined();
    expect(token.name).toBe("Atlas");
    expect(token.scopes).toEqual(["read:workouts"]);
    expect(token.createdAt).toBeInstanceOf(Date);
    expect(token.lastUsedAt).toBeNull();
    expect(token.revokedAt).toBeNull();
    expect(token.toObject()).not.toHaveProperty("token");
  });
  it.each([{ name: " " }, { name: "x".repeat(61) }, { scopes: ["write:workouts"] }, { slot: 10 }])("rejects invalid fields: %j", async (invalid) => {
    await expect(new ApiToken({ ...fields(), ...invalid }).validate()).rejects.toThrow();
  });
  it("declares unique hashes and active capacity slots", () => {
    expect(ApiToken.schema.indexes()).toEqual(expect.arrayContaining([
      [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
      [{ userId: 1, slot: 1 }, expect.objectContaining({ unique: true, partialFilterExpression: { revokedAt: null } })],
    ]));
  });
});
