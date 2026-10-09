import { createHmac, timingSafeEqual } from "node:crypto";

export const GOOGLE_LINK_COOKIE = "recomp-google-link";
export function signGoogleLink(userId: string, nonce: string, expires: number) {
  const body = Buffer.from(JSON.stringify({ userId, nonce, expires })).toString("base64url");
  return `${body}.${createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest("base64url")}`;
}
export function verifyGoogleLink(value: string | undefined, now = Date.now()): { userId: string; nonce: string } | null {
  try {
    const [body, signature, extra] = (value ?? "").split(".");
    if (!body || !signature || extra) return null;
    const expected = createHmac("sha256", process.env.AUTH_SECRET!).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const ticket = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof ticket.userId !== "string" || typeof ticket.nonce !== "string" ||
        !Number.isFinite(ticket.expires) || ticket.expires <= now) return null;
    return { userId: ticket.userId, nonce: ticket.nonce };
  } catch { return null; }
}
