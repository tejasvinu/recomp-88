import { auth } from "@/auth";
import { apiJson } from "@/lib/apiResponse";

export async function authenticateTokenOwner() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  return userId && /^[a-f0-9]{24}$/i.test(userId)
    ? { userId }
    : apiJson({ error: "Sign in to manage connected apps" }, 401);
}
