import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { applySync } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await applySync());
  } catch (error) {
    return jsonError(error);
  }
}
