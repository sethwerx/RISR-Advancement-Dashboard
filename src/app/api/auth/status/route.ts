import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { getAccount } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getAccount());
  } catch (error) {
    return jsonError(error);
  }
}
