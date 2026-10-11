import { trainingRead } from "@/lib/trainingRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await context.params;
  const exerciseId = decodeURIComponent(resolvedParams.id);
  return trainingRead(req, "exercises/history", { exerciseId });
}
