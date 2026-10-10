import { apiJson, databaseUnavailable } from "./apiResponse";
import { authenticateApiToken } from "./apiTokens";
import { API_TOKEN_SCOPE } from "./tokenUtils";
import { accountKey, buildBodyWeightPage, buildTrainingSummary, CALCULATION_VERSION, parseTrainingWindow, TrainingApiError } from "./trainingApi";
import { canonicalTimezone } from "./calendar";
import User from "@/models/User";
import UserData from "@/models/UserData";

export async function trainingRead(req: Request, resource: "training/summary" | "sessions" | "body-weight" | "me") {
  const identity = await authenticateApiToken(req, API_TOKEN_SCOPE);
  if (identity instanceof Response) return identity;
  try {
    const [user, data] = await Promise.all([
      User.findById(identity.userId).select("name -_id").lean(),
      UserData.findOne({ userId: identity.userId }).select("sessions bodyWeightEntries settings.timezone revision lastSyncedAt -_id").lean(),
    ]);
    if (!user) return apiJson({ error: "Invalid API token" }, 401);
    if (resource === "me") return apiJson({ schemaVersion: 2, accountKey: accountKey(identity.userId), user: { name: user.name ?? null },
      authorizedScope: API_TOKEN_SCOPE, timezone: canonicalTimezone(data?.settings?.timezone),
      capabilities: ["training-summary-v2", "session-details-v2", "body-weight-v2", "revision-bound-pagination"],
      supportedSchemas: [1, 2], calculationVersion: CALCULATION_VERSION, revision: data?.revision ?? 0, lastSyncedAt: data?.lastSyncedAt ?? null });
    const window = parseTrainingWindow(new URL(req.url).searchParams, data?.settings?.timezone);
    return apiJson(resource === "body-weight" ? buildBodyWeightPage(data, identity.userId, window) : buildTrainingSummary(data, identity.userId, window, resource));
  } catch (error) {
    if (error instanceof TrainingApiError) return apiJson({ schemaVersion: 2, error: { code: error.code, message: error.message, retryable: error.status === 409 } }, error.status);
    return databaseUnavailable();
  }
}
