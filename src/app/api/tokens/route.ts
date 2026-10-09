import { apiJson, databaseUnavailable } from "@/lib/apiResponse";
import { connectDB } from "@/lib/mongodb";
import { authenticateTokenOwner } from "@/lib/tokenManagement";
import { API_TOKEN_SCOPE, generateApiToken, MAX_API_TOKENS } from "@/lib/tokenUtils";
import ApiToken from "@/models/ApiToken";
import User from "@/models/User";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await authenticateTokenOwner();
  if (owner instanceof Response) return owner;
  try {
    if (!(await connectDB())) return databaseUnavailable();
    const tokens = await ApiToken.find({ userId: owner.userId, revokedAt: null })
      .select("name prefix scopes createdAt lastUsedAt").sort({ createdAt: -1 }).lean();
    return apiJson({ tokens: tokens.map((token) => ({
      id: token._id.toString(), name: token.name, prefix: token.prefix, scopes: token.scopes,
      createdAt: token.createdAt, lastUsedAt: token.lastUsedAt ?? null,
    })) });
  } catch {
    return databaseUnavailable();
  }
}

export async function POST(req: Request) {
  const owner = await authenticateTokenOwner();
  if (owner instanceof Response) return owner;
  let name: string;
  try {
    const body = await req.json();
    name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 60) return apiJson({ error: "Name must be 1–60 characters" }, 400);
  } catch {
    return apiJson({ error: "Invalid JSON payload" }, 400);
  }

  try {
    if (!(await connectDB())) return databaseUnavailable();
    if (!(await User.exists({ _id: owner.userId }))) return apiJson({ error: "Unauthorized" }, 401);
    // Wait for unique indexes before accepting creation, including the first request.
    await ApiToken.init();
    for (let attempt = 0; attempt < MAX_API_TOKENS; attempt++) {
      const active = await ApiToken.find({ userId: owner.userId, revokedAt: null }).select("slot").lean();
      const slot = Array.from({ length: MAX_API_TOKENS }, (_, i) => i)
        .find((candidate) => !active.some((token) => token.slot === candidate));
      if (active.length >= MAX_API_TOKENS || slot === undefined) break;
      const generated = generateApiToken();
      try {
        const token = await ApiToken.create({
          userId: owner.userId, name, tokenHash: generated.tokenHash, prefix: generated.prefix,
          scopes: [API_TOKEN_SCOPE], slot,
        });
        return apiJson({
          token: generated.token, id: token._id.toString(), name: token.name, prefix: token.prefix,
          scopes: token.scopes, createdAt: token.createdAt,
        }, 201);
      } catch (error) {
        // Another request claimed this slot. Re-read capacity and try again.
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
      }
    }
    return apiJson({ error: "You can have at most 10 active tokens. Revoke one first." }, 409);
  } catch {
    return databaseUnavailable();
  }
}
