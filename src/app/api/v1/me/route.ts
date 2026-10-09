import { apiJson, databaseUnavailable } from "@/lib/apiResponse";
import { authenticateApiToken } from "@/lib/apiTokens";
import { mapPublicMe } from "@/lib/publicApi";
import { API_TOKEN_SCOPE } from "@/lib/tokenUtils";
import User from "@/models/User";
import UserData from "@/models/UserData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const identity = await authenticateApiToken(req, API_TOKEN_SCOPE);
  if (identity instanceof Response) return identity;
  try {
    const [user, data] = await Promise.all([
      User.findById(identity.userId).select("name weightUnit -_id").lean(),
      UserData.findOne({ userId: identity.userId }).select("sessions settings.weightUnit lastSyncedAt -_id").lean(),
    ]);
    if (!user) return apiJson({ error: "Invalid API token" }, 401);
    return apiJson(mapPublicMe(user, data));
  } catch {
    return databaseUnavailable();
  }
}
