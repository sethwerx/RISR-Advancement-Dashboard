import { currentSnapshot } from "@/lib/server/office-sync";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await currentSnapshot());
  } catch (error) {
    return jsonError(error);
  }
}
