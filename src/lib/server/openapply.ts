import "server-only";

import { tourEventLabel } from "@/config/dashboard.config";
import { HttpError } from "@/lib/server/http";
import { getServerConfig } from "@/lib/server/env";
import { redact } from "@/lib/redact";
import { studentProfileUrl } from "@/lib/title";
import type { HydratedRegistration, ParentView, RegistrationState, StudentRecord } from "@/lib/types";

/**
 * Read-only OpenApply client.
 * The only POST in this file is the OAuth client-credentials token request.
 * Tours, students, and attendance are never written back to OpenApply.
 */

const TOKEN_TTL_MS = 23 * 60 * 60 * 1000;
const STUDENT_TTL_MS = 5 * 60 * 1000;

let tokenCache: { token: string; exp: number } | null = null;
const studentCache = new Map<number, { at: number; value: FetchedStudent }>();

type FetchedStudent = { student: StudentRecord; parents: ParentView[] };

type OaParent = {
  id?: number;
  name?: string;
  email?: string;
  mobile_phone?: string;
  parent_role?: string;
};

type OaStudent = {
  id?: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  preferred_name?: string | null;
  grade?: string | null;
  status?: string | null;
  custom_status_name?: string | null;
  custom_fields?: { thai_nickname?: string | null } | null;
};

type OaRegistration = {
  id?: number;
  event_id?: number;
  date?: string;
  time?: string;
  student_ids?: number[];
  parent_id?: number;
  attendees_count?: number;
  state?: string;
  note?: string | null;
  host?: string | null;
  campus?: string | null;
};

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export async function getOpenApplyToken(force = false): Promise<string> {
  if (!force && tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const cfg = getServerConfig();
  if (!cfg.openApply.clientId || !cfg.openApply.clientSecret) {
    throw new HttpError(500, "OpenApply credentials are not configured.");
  }
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const basic = Buffer.from(`${cfg.openApply.clientId}:${cfg.openApply.clientSecret}`).toString("base64");
  const response = await fetch(cfg.openApply.tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": cfg.openApply.userAgent,
    },
    body,
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    tokenCache = null;
    throw new Error(`OpenApply token request failed (${response.status}): ${redact(text).slice(0, 200)}`);
  }
  let parsed: { access_token?: string };
  try {
    parsed = JSON.parse(text) as { access_token?: string };
  } catch {
    throw new Error("OpenApply token response was not JSON.");
  }
  if (!parsed.access_token) throw new Error("OpenApply token response did not include an access token.");
  tokenCache = { token: parsed.access_token, exp: Date.now() + TOKEN_TTL_MS };
  return parsed.access_token;
}

async function oaFetch(path: string, retry = true): Promise<unknown> {
  const cfg = getServerConfig();
  const token = await getOpenApplyToken(false);
  const response = await fetch(`${cfg.openApply.baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": cfg.openApply.userAgent,
    },
    cache: "no-store",
  });
  if (response.status === 401 && retry) {
    await getOpenApplyToken(true);
    return oaFetch(path, false);
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenApply request failed (${response.status}): ${redact(text).slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

function normalizeState(value: unknown): RegistrationState {
  const state = String(value ?? "").toLowerCase();
  if (state === "scheduled") return "scheduled";
  if (state === "canceled" || state === "cancelled") return "canceled";
  return "other";
}

function mapParents(parents: OaParent[] | undefined): ParentView[] {
  return (parents ?? []).map((parent) => ({
    name: parent.name?.trim() || "Parent",
    email: parent.email?.trim() || "",
    phone: parent.mobile_phone?.trim() || "",
    role: parent.parent_role?.trim() || "Parent",
  }));
}

function mapStudent(payload: { student?: OaStudent; linked?: { parents?: OaParent[] } }, fallbackId: number): FetchedStudent {
  const student = payload.student ?? {};
  const id = Number(student.id ?? fallbackId);
  let firstName = student.first_name?.trim() || "";
  let lastName = student.last_name?.trim() || "";
  if (!firstName && !lastName && student.name) {
    const parts = student.name.trim().split(/\s+/);
    firstName = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0] || "";
    lastName = parts.length > 1 ? parts[parts.length - 1] : "";
  }
  return {
    student: {
      id,
      firstName: firstName || "Unknown",
      lastName: lastName || `Student ${id}`,
      preferredName: student.preferred_name?.trim() || "",
      grade: student.grade?.trim() || "",
      status: (student.custom_status_name || student.status || "").trim(),
      thaiNickname: student.custom_fields?.thai_nickname?.trim() || "",
      profileUrl: studentProfileUrl(id),
    },
    parents: mapParents(payload.linked?.parents),
  };
}

function unavailableStudent(id: number): FetchedStudent {
  return {
    student: {
      id,
      firstName: "Unavailable",
      lastName: `Student ${id}`,
      preferredName: "",
      grade: "",
      status: "",
      thaiNickname: "",
      profileUrl: studentProfileUrl(id),
    },
    parents: [],
  };
}

async function fetchStudent(id: number): Promise<FetchedStudent> {
  const cached = studentCache.get(id);
  if (cached && Date.now() - cached.at < STUDENT_TTL_MS) return cached.value;
  const payload = (await oaFetch(`/students/${id}`)) as { student?: OaStudent; linked?: { parents?: OaParent[] } };
  const mapped = mapStudent(payload, id);
  studentCache.set(id, { at: Date.now(), value: mapped });
  return mapped;
}

async function fetchEvent(eventId: number): Promise<{
  id: number;
  label: string;
  duration: number;
  registrations: OaRegistration[];
}> {
  const payload = (await oaFetch(`/events/${eventId}`)) as {
    event?: { id?: number; title?: string; duration?: number; registrations?: OaRegistration[] };
    registrations?: OaRegistration[];
  };
  const event = payload.event ?? {};
  const registrations = event.registrations ?? payload.registrations ?? [];
  return {
    id: Number(event.id ?? eventId),
    label: tourEventLabel(eventId, event.title),
    duration: Number(event.duration) || getServerConfig().durationMinutes,
    registrations: Array.isArray(registrations) ? registrations : [],
  };
}

export async function loadOpenApplyRegistrations(): Promise<HydratedRegistration[]> {
  const cfg = getServerConfig();
  const events = await mapPool(cfg.openApply.tourEventIds, 3, (id) => fetchEvent(id));
  const pairs = events.flatMap((event) => event.registrations.map((registration) => ({ event, registration })));
  const studentIds = [...new Set(pairs.flatMap((pair) => pair.registration.student_ids ?? []))];
  const fetched = await mapPool(studentIds, 4, async (id) => {
    try {
      return await fetchStudent(id);
    } catch {
      return unavailableStudent(id);
    }
  });
  const byId = new Map(fetched.map((item) => [item.student.id, item]));

  return pairs
    .filter((pair) => pair.registration.id != null && pair.registration.date && pair.registration.time)
    .map((pair) => {
      const ids = pair.registration.student_ids ?? [];
      const students = ids.map((id) => byId.get(id)?.student ?? unavailableStudent(id).student);
      const parents = new Map<string, ParentView>();
      for (const id of ids) {
        for (const parent of byId.get(id)?.parents ?? []) {
          parents.set(`${parent.email}|${parent.name}`, parent);
        }
      }
      return {
        id: Number(pair.registration.id),
        eventId: Number(pair.registration.event_id ?? pair.event.id),
        eventLabel: pair.event.label,
        date: String(pair.registration.date),
        time: String(pair.registration.time),
        state: normalizeState(pair.registration.state),
        host: pair.registration.host?.trim() || "",
        campus: pair.registration.campus?.trim() || "Ratchapruek",
        note: pair.registration.note?.trim() || "",
        attendeesCount: Number(pair.registration.attendees_count ?? students.length + 1),
        students,
        parents: [...parents.values()],
      } satisfies HydratedRegistration;
    });
}
