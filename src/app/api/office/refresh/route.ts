import { refreshOffice } from "@/lib/server/office-sync";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const snapshot = await refreshOffice("manual");
    return Response.json({
      mock: snapshot.mock,
      generatedAt: snapshot.generatedAt,
      syncLog: snapshot.syncLog,
    });
  } catch (error) {
    return jsonError(error);
  }
}
