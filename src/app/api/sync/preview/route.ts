import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { previewSync } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    return NextResponse.json(await previewSync());
  } catch (error) {
    return jsonError(error);
  }
}
