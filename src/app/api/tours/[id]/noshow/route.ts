import { NextResponse } from "next/server";
import { HttpError, jsonError } from "@/lib/server/http";
import { confirmOaUpdated, markNoShow, undoNoShow } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const registrationId = Number(id);
    if (!Number.isInteger(registrationId)) throw new HttpError(400, "Unknown registration.");
    const body = (await request.json()) as { action?: string };
    if (body.action === "mark") return NextResponse.json(await markNoShow(registrationId));
    if (body.action === "undo") return NextResponse.json(await undoNoShow(registrationId));
    if (body.action === "oa-updated") return NextResponse.json(await confirmOaUpdated(registrationId));
    throw new HttpError(400, "Unknown no-show action.");
  } catch (error) {
    return jsonError(error);
  }
}
