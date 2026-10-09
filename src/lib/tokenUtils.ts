import { createHash, randomBytes } from "node:crypto";

export const API_TOKEN_SCOPE = "read:workouts" as const;
export const MAX_API_TOKENS = 10;
export type ApiTokenScope = typeof API_TOKEN_SCOPE;

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken() {
  const token = `rcp_${randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashApiToken(token), prefix: token.slice(4, 12) };
}

export function parseBearerToken(authorization: string | null): string | null {
  const match = authorization?.trim().match(/^Bearer[\t ]+(\S+)$/i);
  const token = match?.[1];
  return token && /^rcp_[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
