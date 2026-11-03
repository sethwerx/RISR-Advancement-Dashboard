import "server-only";

import { buildEventBody, buildWalkInEventBody } from "@/lib/calendar-payload";
import { buildTourViews } from "@/lib/merge";
import { buildSeedBundle } from "@/lib/mock/seed";
import { formatNotesBlock, initialNotesDocBody, notesSectionHtml, upsertNotesSection } from "@/lib/notes-format";
import { insertCalendarEvent, listCalendarEvents, patchCalendarDescription, patchCalendarTitle } from "@/lib/server/calendar";
import { appendToDoc, copyNotesDoc, docIdFromUrl, trashFile } from "@/lib/server/docs";
import { getServerConfig, isMockMode } from "@/lib/server/env";
import { assertCanWrite, getGoogleEmail, readSession } from "@/lib/server/google-auth";
import { HttpError } from "@/lib/server/http";
import { readStore, updateStore } from "@/lib/server/mock-store";
import { validateNotes } from "@/lib/server/notes";
import { loadOpenApplyRegistrations } from "@/lib/server/openapply";
import { readSheetState, writeDashboardSheet } from "@/lib/server/sheets";
import { readWalkInFile, writeWalkInFile } from "@/lib/server/walkin-file";
import { buildDescription, buildTourTitle, formatPersonName, notesDocumentName, withNoShowTag, withoutNoShowTag } from "@/lib/title";
import { tourInterval } from "@/lib/time";
import {
  buildWalkInDescription,
  nextWalkInId,
  parseWalkInFields,
  walkInRecordFromFields,
  walkInRecordToTour,
  walkInTitleFor,
  type WalkInInput,
  type WalkInRecord,
} from "@/lib/walkin";
import { walkInDurationMinutes } from "@/tabs/tours/walkinForm.config";
import { errorMessage } from "@/lib/redact";
import type {
  AccountState,
  CalendarEvent,
  NoShowAction,
  NotesDoc,
  Snapshot,
  SyncApplyResult,
  SyncPreview,
  TourNotes,
  TourView,
  ToursResponse,
} from "@/lib/types";

let liveQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = liveQueue.then(task, task);
  liveQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function toursWithWalkIns(
  tours: TourView[],
  records: WalkInRecord[],
  events: CalendarEvent[],
  notes: TourNotes[],
  docs: Record<string, NotesDoc>,
): TourView[] {
  const duration = getServerConfig().durationMinutes;
  const walkIns = records
    .filter((record) => record.values && record.date && record.time)
    .map((record) =>
    walkInRecordToTour(
      record,
      events.find((event) => event.id === record.calendarEventId) ?? null,
      notes.find((note) => note.registrationId === record.id) ?? null,
      docs[String(record.id)] ?? null,
      duration,
    ),
  );
  return [...tours, ...walkIns];
}

function mockBundle() {
  const seed = buildSeedBundle();
  const store = readStore();
  const tours = buildTourViews(
    seed.registrations,
    store.events,
    store.notes,
    store.log,
    store.docs,
    getServerConfig().durationMinutes,
  );
  return {
    tours: toursWithWalkIns(tours, store.walkIns ?? [], store.events, store.notes, store.docs),
    log: store.log,
  };
}

function mockSnapshot(): Snapshot {
  const bundle = mockBundle();
  return { tours: bundle.tours, log: bundle.log, sheet: null };
}

async function account(): Promise<AccountState> {
  const cfg = getServerConfig();
  if (cfg.mock) {
    return {
      mock: true,
      signedIn: false,
      email: "",
      organizerEmail: cfg.google.organizerEmail,
      canWrite: true,
      message: "",
    };
  }
  let email = "";
  let message = "";
  try {
    email = await getGoogleEmail();
  } catch (error) {
    message = error instanceof HttpError ? error.message : "Google is not connected.";
  }
  let signedIn = false;
  try {
    signedIn = await readSession();
  } catch {
    signedIn = false;
  }
  const canWrite = signedIn && email === cfg.google.organizerEmail;
  if (!message && !signedIn) message = `Sign in as ${cfg.google.organizerEmail} to update the calendar.`;
  if (!message && email && email !== cfg.google.organizerEmail) {
    message = `Signed in as ${email}. Calendar changes are limited to ${cfg.google.organizerEmail}.`;
  }
  return { mock: false, signedIn, email, organizerEmail: cfg.google.organizerEmail, canWrite, message };
}

async function loadLive(forceSheet: boolean): Promise<ToursResponse> {
  const cfg = getServerConfig();
  const acct = await account();
  let sheetWarning: string | undefined;
  let notes: TourNotes[] = [];
  let log: ToursResponse["log"] = [];
  let sheet = null as ToursResponse["sheet"];
  let sheetReadable = true;
  try {
    const state = await readSheetState();
    notes = state.notes;
    log = state.log;
    sheet = state.link;
  } catch (error) {
    sheetReadable = false;
    sheetWarning = errorMessage(error);
  }
  const [registrations, events] = await Promise.all([loadOpenApplyRegistrations(), listCalendarEvents()]);
  const openApplyTours = buildTourViews(registrations, events, notes, log, {}, cfg.durationMinutes);
  const tours = toursWithWalkIns(openApplyTours, readWalkInFile(), events, notes, {});
  if (sheetReadable) {
    try {
      sheet = await writeDashboardSheet(tours, log, { force: forceSheet });
    } catch (error) {
      sheetWarning = errorMessage(error);
    }
  }
  return {
    mock: false,
    generatedAt: new Date().toISOString(),
    sheet,
    account: acct,
    tours,
    log,
    sheetWarning,
  };
}

export async function getAccount(): Promise<AccountState> {
  return account();
}

export async function getTours(): Promise<ToursResponse> {
  if (isMockMode()) {
    const bundle = mockBundle();
    return {
      mock: true,
      generatedAt: new Date().toISOString(),
      sheet: null,
      account: await account(),
      tours: bundle.tours,
      log: bundle.log,
    };
  }
  return enqueue(() => loadLive(false));
}

export function buildPreview(tours: TourView[]): SyncPreview {
  const when = (tour: TourView) => `${tour.date} ${tour.timeLabel}`;
  return {
    create: tours
      .filter((tour) => tour.state === "scheduled" && tour.syncStatus === "missing")
      .map((tour) => ({
        registrationId: tour.registrationId,
        displayName: tour.displayName,
        date: tour.date,
        timeLabel: tour.timeLabel,
        eventLabel: tour.eventLabel,
        title: buildTourTitle(tour.students, false),
      })),
    rescheduled: tours
      .filter((tour) => tour.syncStatus === "rescheduled")
      .map((tour) => ({
        registrationId: tour.registrationId,
        displayName: tour.displayName,
        oaWhen: when(tour),
        calendarWhen: tour.calendar?.whenLabel ?? "Unknown calendar time",
        reason: "rescheduled" as const,
      })),
    canceledOnCalendar: tours
      .filter((tour) => tour.syncStatus === "canceled" && tour.calendar)
      .map((tour) => ({
        registrationId: tour.registrationId,
        displayName: tour.displayName,
        oaWhen: when(tour),
        calendarWhen: tour.calendar?.whenLabel ?? "Still on the calendar",
        reason: "canceled" as const,
      })),
    syncedCount: tours.filter((tour) => tour.syncStatus === "synced").length,
    canceledWithoutEventCount: tours.filter((tour) => tour.syncStatus === "canceled" && !tour.calendar).length,
  };
}

export async function previewSync(): Promise<SyncPreview> {
  if (isMockMode()) return buildPreview(mockBundle().tours);
  const response = await enqueue(() => loadLive(false));
  return buildPreview(response.tours);
}

async function createLiveEvent(tour: TourView) {
  const cfg = getServerConfig();
  const doc = await copyNotesDoc(notesDocumentName(tour.students));
  try {
    if (tour.notes) {
      await appendToDoc(
        doc.id,
        formatNotesBlock({
          displayName: tour.displayName,
          date: tour.date,
          timeLabel: tour.timeLabel,
          notes: tour.notes,
        }),
      );
    }
    const body = buildEventBody({
      title: buildTourTitle(tour.students, false),
      description: buildDescription(
        tour.students.map((student) => student.id),
        tour.registrationId,
      ),
      startIso: tour.startIso,
      endIso: tour.endIso,
      guests: cfg.google.guests,
      registrationId: tour.registrationId,
      notes: { fileId: doc.id, fileUrl: doc.url },
    });
    const event = await insertCalendarEvent(body);
    return { registrationId: tour.registrationId, eventId: event.id, notesDocUrl: doc.url };
  } catch (error) {
    await trashFile(doc.id).catch(() => undefined);
    throw error;
  }
}

function snapshotOf(response: ToursResponse): Snapshot {
  return { tours: response.tours, log: response.log, sheet: response.sheet, sheetWarning: response.sheetWarning };
}

export async function applySync(): Promise<SyncApplyResult & Snapshot> {
  if (isMockMode()) return mockApply();
  return enqueue(() => liveApply());
}

async function liveApply(): Promise<SyncApplyResult & Snapshot> {
  await assertCanWrite();
  const before = await loadLive(false);
  const plan = buildPreview(before.tours);
  const created: SyncApplyResult["created"] = [];
  const errors: SyncApplyResult["errors"] = [];
  for (const item of plan.create) {
    const tour = before.tours.find((candidate) => candidate.registrationId === item.registrationId);
    if (!tour) continue;
    try {
      created.push(await createLiveEvent(tour));
    } catch (error) {
      errors.push({ registrationId: item.registrationId, message: errorMessage(error) });
    }
  }
  const after = await loadLive(true);
  return {
    created,
    errors,
    flaggedRescheduled: plan.rescheduled.length,
    flaggedCanceled: plan.canceledOnCalendar.length,
    ...snapshotOf(after),
  };
}

async function mockApply(): Promise<SyncApplyResult & Snapshot> {
  const before = mockBundle();
  const plan = buildPreview(before.tours);
  const created: SyncApplyResult["created"] = [];
  await updateStore((store) => {
    for (const item of plan.create) {
      const tour = before.tours.find((candidate) => candidate.registrationId === item.registrationId);
      if (!tour) continue;
      const docName = notesDocumentName(tour.students);
      const url = `sample://notes/${tour.registrationId}`;
      let body = initialNotesDocBody(docName);
      if (tour.notes) {
        body += `\n${formatNotesBlock({
          displayName: tour.displayName,
          date: tour.date,
          timeLabel: tour.timeLabel,
          notes: tour.notes,
        })}\n`;
      }
      store.docs[String(tour.registrationId)] = { name: docName, url, body };
      const eventId = store.events.some((event) => event.id === `cal-${tour.registrationId}`)
        ? `cal-${tour.registrationId}-${Date.now()}`
        : `cal-${tour.registrationId}`;
      store.events.push({
        id: eventId,
        title: buildTourTitle(tour.students, false),
        description: buildDescription(
          tour.students.map((student) => student.id),
          tour.registrationId,
        ),
        startIso: tour.startIso,
        endIso: tour.endIso,
        htmlLink: "",
        registrationId: tour.registrationId,
        notesDocUrl: url,
      });
      created.push({ registrationId: tour.registrationId, eventId, notesDocUrl: url });
    }
  });
  return {
    created,
    errors: [],
    flaggedRescheduled: plan.rescheduled.length,
    flaggedCanceled: plan.canceledOnCalendar.length,
    ...mockSnapshot(),
  };
}

function requireTour(tours: TourView[], id: number): TourView {
  const tour = tours.find((item) => item.registrationId === id);
  if (!tour) throw new HttpError(404, "That registration is not in the tour list.");
  return tour;
}

function logEntry(tour: TourView, action: NoShowAction) {
  return {
    id: `log-${tour.registrationId}-${Date.now()}`,
    at: new Date().toISOString(),
    registrationId: tour.registrationId,
    studentNames: tour.displayName,
    action,
    actor: getServerConfig().actorName,
    calendarEventId: tour.calendar?.id ?? "",
  };
}

async function changeNoShow(id: number, action: "mark" | "undo" | "oa-updated"): Promise<Snapshot> {
  if (isMockMode()) return mockNoShow(id, action);
  return enqueue(() => liveNoShow(id, action));
}

export const markNoShow = (id: number) => changeNoShow(id, "mark");
export const undoNoShow = (id: number) => changeNoShow(id, "undo");
export const confirmOaUpdated = (id: number) => changeNoShow(id, "oa-updated");

async function liveNoShow(id: number, action: "mark" | "undo" | "oa-updated"): Promise<Snapshot> {
  await assertCanWrite();
  const current = await loadLive(false);
  const tour = requireTour(current.tours, id);
  if (action !== "oa-updated") {
    if (!tour.calendar) throw new HttpError(400, "This tour is not on the calendar yet.");
    if (action === "mark" && tour.noShow) throw new HttpError(400, "This tour is already marked as a no-show.");
    if (action === "undo" && !tour.noShow) throw new HttpError(400, "This tour is not marked as a no-show.");
    const title = action === "mark" ? withNoShowTag(tour.calendar.title) : withoutNoShowTag(tour.calendar.title);
    await patchCalendarTitle(tour.calendar.id, title);
  }
  const actionName: NoShowAction = action === "mark" ? "No Show" : action === "undo" ? "Undo" : "OA updated";
  const log = [...current.log, logEntry(tour, actionName)];
  const tours = current.tours.map((item) => {
    if (item.registrationId !== id) return item;
    if (action === "oa-updated") return { ...item, pendingOaReminder: false };
    if (!item.calendar) return item;
    const title = action === "mark" ? withNoShowTag(item.calendar.title) : withoutNoShowTag(item.calendar.title);
    return {
      ...item,
      noShow: action === "mark",
      pendingOaReminder: action === "mark",
      calendar: { ...item.calendar, title },
    };
  });
  let sheet = current.sheet;
  let sheetWarning = current.sheetWarning;
  try {
    sheet = await writeDashboardSheet(tours, log, { force: true });
  } catch (error) {
    sheetWarning = errorMessage(error);
  }
  return { tours, log, sheet, sheetWarning };
}

async function mockNoShow(id: number, action: "mark" | "undo" | "oa-updated"): Promise<Snapshot> {
  const tour = requireTour(mockBundle().tours, id);
  if (action !== "oa-updated") {
    if (!tour.calendar) throw new HttpError(400, "This tour is not on the calendar yet.");
    if (action === "mark" && tour.noShow) throw new HttpError(400, "This tour is already marked as a no-show.");
    if (action === "undo" && !tour.noShow) throw new HttpError(400, "This tour is not marked as a no-show.");
  }
  await updateStore((store) => {
    if (action !== "oa-updated") {
      const event = store.events.find((item) => item.id === tour.calendar?.id);
      if (!event) throw new HttpError(400, "This tour is not on the calendar yet.");
      event.title = action === "mark" ? withNoShowTag(event.title) : withoutNoShowTag(event.title);
    }
    const actionName: NoShowAction = action === "mark" ? "No Show" : action === "undo" ? "Undo" : "OA updated";
    store.log.push(logEntry(tour, actionName));
  });
  return mockSnapshot();
}

export async function saveNotes(id: number, input: unknown): Promise<Snapshot> {
  const notes = validateNotes(input, id);
  if (isMockMode()) return mockNotes(id, notes);
  return enqueue(() => liveNotes(id, notes));
}

async function liveNotes(id: number, notes: ReturnType<typeof validateNotes>): Promise<Snapshot> {
  await assertCanWrite();
  const current = await loadLive(false);
  const tour = requireTour(current.tours, id);
  const docId = docIdFromUrl(tour.calendar?.notesDocUrl ?? "");
  if (tour.calendar) {
    const description = upsertNotesSection(tour.calendar.description ?? "", notesSectionHtml(notes));
    await patchCalendarDescription(tour.calendar.id, description);
  }
  if (docId) {
    await appendToDoc(
      docId,
      formatNotesBlock({ displayName: tour.displayName, date: tour.date, timeLabel: tour.timeLabel, notes }),
    );
  }
  const tours = current.tours.map((item) => (item.registrationId === id ? { ...item, notes } : item));
  let sheet = current.sheet;
  let sheetWarning = tour.calendar
    ? current.sheetWarning
    : "Notes are saved on the master sheet. There is no calendar event yet, so the Notes section could not be updated.";
  try {
    sheet = await writeDashboardSheet(tours, current.log, { force: true });
  } catch (error) {
    sheetWarning = errorMessage(error);
  }
  return { tours, log: current.log, sheet, sheetWarning };
}

async function mockNotes(id: number, notes: ReturnType<typeof validateNotes>): Promise<Snapshot> {
  const tour = requireTour(mockBundle().tours, id);
  await updateStore((store) => {
    store.notes = store.notes.filter((item) => item.registrationId !== id).concat(notes);
    const event = store.events.find((item) => item.id === tour.calendar?.id);
    if (event) event.description = upsertNotesSection(event.description, notesSectionHtml(notes));
    const key = String(id);
    const doc = store.docs[key];
    const block = formatNotesBlock({
      displayName: tour.displayName,
      date: tour.date,
      timeLabel: tour.timeLabel,
      notes,
    });
    if (doc) doc.body = `${doc.body.trim()}\n\n${block}\n`;
  });
  const snapshot = mockSnapshot();
  if (!tour.calendar) {
    snapshot.sheetWarning = "Notes are saved in the sample sheet. There is no calendar event yet, so the Notes section could not be updated.";
  }
  return snapshot;
}

export async function createWalkIn(input: unknown): Promise<Snapshot> {
  let values: WalkInInput;
  try {
    values = parseWalkInFields(input);
  } catch (error) {
    throw new HttpError(400, error instanceof Error ? error.message : "Walk-in details are missing.");
  }
  if (isMockMode()) return mockCreateWalkIn(values);
  return enqueue(() => liveCreateWalkIn(values));
}

async function mockCreateWalkIn(values: WalkInInput): Promise<Snapshot> {
  await updateStore((store) => {
    const id = nextWalkInId(store.walkIns ?? []);
    const record = walkInRecordFromFields(values, id, `walkin-${id}`);
    const interval = tourInterval(record.date, record.time, walkInDurationMinutes);
    const student = {
      firstName: record.studentFirstName,
      preferredName: record.studentPreferredName,
      lastName: record.studentLastName,
    };
    const docName = `Notes - Walk-in - ${formatPersonName(student)} (${record.gradeApplyingFor})`;
    const url = `sample://notes/${id}`;
    store.docs[String(id)] = { name: docName, url, body: initialNotesDocBody(docName) };
    store.events.push({
      id: record.calendarEventId,
      title: walkInTitleFor(record),
      description: buildWalkInDescription(record),
      startIso: interval.start,
      endIso: interval.end,
      htmlLink: "",
      registrationId: null,
      notesDocUrl: url,
      kind: "walk-in",
    });
    store.walkIns = [...(store.walkIns ?? []), record];
  });
  return mockSnapshot();
}

async function liveCreateWalkIn(values: WalkInInput): Promise<Snapshot> {
  await assertCanWrite();
  const cfg = getServerConfig();
  const existing = readWalkInFile();
  const id = nextWalkInId(existing);
  const record = walkInRecordFromFields(values, id, "");
  const interval = tourInterval(record.date, record.time, walkInDurationMinutes);
  const student = {
    firstName: record.studentFirstName,
    preferredName: record.studentPreferredName,
    lastName: record.studentLastName,
  };
  const doc = await copyNotesDoc(`Notes - Walk-in - ${formatPersonName(student)} (${record.gradeApplyingFor})`);
  try {
    const created = await insertCalendarEvent(
      buildWalkInEventBody({
        title: walkInTitleFor(record),
        description: buildWalkInDescription(record),
        startIso: interval.start,
        endIso: interval.end,
        guests: cfg.google.guests,
        walkInId: id,
        notes: { fileId: doc.id, fileUrl: doc.url },
      }),
    );
    record.calendarEventId = created.id;
    writeWalkInFile([...existing, record]);
  } catch (error) {
    await trashFile(doc.id).catch(() => undefined);
    throw error;
  }
  return loadLive(true);
}
