import "server-only";

import { CONCERNS } from "@/lib/constants";
import { HttpError } from "@/lib/server/http";
import type { TourNotes } from "@/lib/types";

export function validateNotes(input: unknown, registrationId: number): TourNotes {
  if (!input || typeof input !== "object") throw new HttpError(400, "Notes are missing.");
  const body = input as Partial<TourNotes>;
  const gradeOfInterest = String(body.gradeOfInterest ?? "").trim();
  const leadSource = String(body.leadSource ?? "").trim();
  const nextStep = String(body.nextStep ?? "").trim();
  const tourGuide = String(body.tourGuide ?? "").trim();
  const interestLevel = Number(body.interestLevel);
  const concerns = Array.isArray(body.concerns) ? body.concerns.map((item) => String(item)) : [];
  if (!gradeOfInterest || !leadSource || !nextStep || !tourGuide) {
    throw new HttpError(400, "Grade of interest, lead source, next step, and tour guide are required.");
  }
  if (!Number.isInteger(interestLevel) || interestLevel < 1 || interestLevel > 5) {
    throw new HttpError(400, "Interest level must be from 1 to 5.");
  }
  const allowed = new Set<string>(CONCERNS);
  if (concerns.some((concern) => !allowed.has(concern))) throw new HttpError(400, "Unknown concern.");
  const concernOther = String(body.concernOther ?? "").trim();
  if (concerns.includes("Other") && !concernOther) {
    throw new HttpError(400, "Add a short note for the other concern.");
  }
  return {
    registrationId,
    gradeOfInterest,
    leadSource,
    interestLevel,
    concerns,
    concernOther: concerns.includes("Other") ? concernOther : "",
    nextStep,
    tourGuide,
    comment: String(body.comment ?? "").trim(),
    updatedAt: new Date().toISOString(),
  };
}
