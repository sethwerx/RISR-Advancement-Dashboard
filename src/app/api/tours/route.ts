import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { getTours } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getTours());
  } catch (error) {
    return jsonError(error);
  }
}
