import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/redact";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function jsonError(error: unknown): NextResponse {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : errorMessage(error);
  return NextResponse.json({ error: message }, { status });
}
