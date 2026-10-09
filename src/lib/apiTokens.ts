import { connectDB } from "@/lib/mongodb";
import { InMemoryRateLimiter } from "@/lib/rateLimit";
import { apiJson, databaseUnavailable } from "@/lib/apiResponse";
import { hashApiToken, parseBearerToken, type ApiTokenScope } from "@/lib/tokenUtils";
import ApiToken from "@/models/ApiToken";

const tokenLimiter = new InMemoryRateLimiter({ windowMs: 60_000, max: 60 });
const LAST_USED_INTERVAL_MS = 5 * 60_000;

export async function authenticateApiToken(req: Request, scope: ApiTokenScope) {
  const plaintext = parseBearerToken(req.headers.get("authorization"));
  if (!plaintext) return apiJson({ error: "Missing or invalid API token" }, 401);

  try {
    if (!(await connectDB())) return databaseUnavailable();
    const token = await ApiToken.findOne({
      tokenHash: hashApiToken(plaintext),
      revokedAt: null,
      scopes: scope,
    }).select("userId lastUsedAt").lean();
    if (!token) return apiJson({ error: "Invalid or revoked API token" }, 401);

    if (!tokenLimiter.isAllowed(token._id.toString())) {
      return apiJson({ error: "Too many requests. Please try again in a minute." }, 429);
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - LAST_USED_INTERVAL_MS);
    if (!token.lastUsedAt || token.lastUsedAt <= cutoff) {
      // Conditional update prevents concurrent requests from writing more often.
      await ApiToken.updateOne(
        { _id: token._id, revokedAt: null, $or: [{ lastUsedAt: null }, { lastUsedAt: { $lte: cutoff } }] },
        { $set: { lastUsedAt: now } }
      ).catch(() => { /* Usage tracking is best effort. Never log the token. */ });
    }
    return { userId: token.userId.toString() };
  } catch {
    return databaseUnavailable();
  }
}
