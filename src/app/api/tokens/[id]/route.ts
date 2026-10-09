import { apiJson, databaseUnavailable } from "@/lib/apiResponse";
import { connectDB } from "@/lib/mongodb";
import { authenticateTokenOwner } from "@/lib/tokenManagement";
import ApiToken from "@/models/ApiToken";

export const runtime = "nodejs";

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const owner = await authenticateTokenOwner();
  if (owner instanceof Response) return owner;
  const { id } = await context.params;
  if (!/^[a-f0-9]{24}$/i.test(id)) return apiJson({ error: "Token not found" }, 404);
  try {
    if (!(await connectDB())) return databaseUnavailable();
    const token = await ApiToken.findOneAndUpdate(
      { _id: id, userId: owner.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    if (!token) return apiJson({ error: "Token not found" }, 404);
    return apiJson({ ok: true });
  } catch {
    return databaseUnavailable();
  }
}
