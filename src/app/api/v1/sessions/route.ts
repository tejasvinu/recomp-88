import { apiJson, databaseUnavailable } from "@/lib/apiResponse";
import { authenticateApiToken } from "@/lib/apiTokens";
import { mapPublicWorkouts, parseApiWindow } from "@/lib/publicApi";
import { API_TOKEN_SCOPE } from "@/lib/tokenUtils";
import User from "@/models/User";
import UserData from "@/models/UserData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const identity = await authenticateApiToken(req, API_TOKEN_SCOPE);
  if (identity instanceof Response) return identity;
  const window = parseApiWindow(new URL(req.url).searchParams);
  if ("error" in window) return apiJson(window, 400);
  try {
    const [user, data] = await Promise.all([
      User.findById(identity.userId).select("weightUnit -_id").lean(),
      UserData.findOne({ userId: identity.userId }).select("sessions bodyWeightEntries settings -_id").lean(),
    ]);
    if (!user) return apiJson({ error: "Invalid API token" }, 401);
    return apiJson(mapPublicWorkouts(data, user.weightUnit, window));
  } catch {
    return databaseUnavailable();
  }
}
