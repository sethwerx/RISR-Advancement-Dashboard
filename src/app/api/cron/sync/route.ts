import { NextResponse } from "next/server";
import { refreshOffice } from "@/lib/server/office-sync";
import { jsonError } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim() || "";
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const snapshot = await refreshOffice("schedule");
    return NextResponse.json({
      ok: true,
      mock: snapshot.mock,
      generatedAt: snapshot.generatedAt,
      rows: snapshot.syncLog.at(-1)?.rows ?? 0,
    });
  } catch (error) {
    return jsonError(error);
  }
}
