import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { createWalkIn } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await createWalkIn(await request.json()));
  } catch (error) {
    return jsonError(error);
  }
}
