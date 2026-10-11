import { trainingRead } from "@/lib/trainingRoute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return trainingRead(req, "exercises");
}
