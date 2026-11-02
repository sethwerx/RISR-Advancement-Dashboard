import { NextResponse } from "next/server";
import { HttpError, jsonError } from "@/lib/server/http";
import { saveNotes } from "@/lib/server/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const registrationId = Number(id);
    if (!Number.isInteger(registrationId)) throw new HttpError(400, "Unknown registration.");
    return NextResponse.json(await saveNotes(registrationId, await request.json()));
  } catch (error) {
    return jsonError(error);
  }
}
