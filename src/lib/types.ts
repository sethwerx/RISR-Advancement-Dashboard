export type RegistrationState = "scheduled" | "canceled" | "other";

export type SyncStatus = "synced" | "missing" | "rescheduled" | "canceled";

export type ParentView = {
  name: string;
  email: string;
  phone: string;
  role: string;
};

export type StudentRecord = {
  id: number;
  firstName: string;
  lastName: string;
  preferredName: string;
  grade: string;
  status: string;
  thaiNickname: string;
  profileUrl: string;
};

export type HydratedRegistration = {
  id: number;
  eventId: number;
  eventLabel: string;
  date: string;
  time: string;
  state: RegistrationState;
  host: string;
  campus: string;
  note: string;
  attendeesCount: number;
  students: StudentRecord[];
  parents: ParentView[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  startIso: string;
  endIso: string;
  htmlLink: string;
  registrationId: number | null;
  notesDocUrl: string;
  /** Walk-in events are not matched to OpenApply registrations. */
  kind?: "walk-in";
};

export type TourNotes = {
  registrationId: number;
  gradeOfInterest: string;
  leadSource: string;
  interestLevel: number;
  concerns: string[];
  concernOther: string;
  nextStep: string;
  tourGuide: string;
  comment: string;
  updatedAt: string;
};

export type NoShowAction = "No Show" | "OA updated" | "Undo";

export type NoShowLogEntry = {
  id: string;
  at: string;
  registrationId: number;
  studentNames: string;
  action: NoShowAction;
  actor: string;
  calendarEventId: string;
};

export type NotesDoc = {
  name: string;
  url: string;
  body: string;
};

export type TourView = {
  registrationId: number;
  eventId: number;
  eventLabel: string;
  date: string;
  time: string;
  endTime: string;
  startIso: string;
  endIso: string;
  timeLabel: string;
  students: StudentRecord[];
  displayName: string;
  gradesLabel: string;
  statusLabel: string;
  source: "OpenApply" | "Walk-in";
  /** How the family heard about the school, when it came from a booking form rather than tour notes. */
  inquirySource: string;
  state: RegistrationState;
  host: string;
  campus: string;
  note: string;
  attendeesCount: number;
  parents: ParentView[];
  syncStatus: SyncStatus;
  noShow: boolean;
  pendingOaReminder: boolean;
  calendar: {
    id: string;
    title: string;
    htmlLink: string;
    startIso: string;
    endIso: string;
    whenLabel: string;
    description: string;
    notesDocUrl: string;
    notesDocName: string;
    notesDocBody: string;
  } | null;
  notes: TourNotes | null;
};

export type SheetLink = {
  id: string;
  url: string;
  printPdfUrl: string;
};

export type AccountState = {
  mock: boolean;
  signedIn: boolean;
  email: string;
  organizerEmail: string;
  canWrite: boolean;
  message: string;
};

export type ToursResponse = {
  mock: boolean;
  generatedAt: string;
  sheet: SheetLink | null;
  account: AccountState;
  tours: TourView[];
  log: NoShowLogEntry[];
  sheetWarning?: string;
};

export type SyncCreateItem = {
  registrationId: number;
  displayName: string;
  date: string;
  timeLabel: string;
  eventLabel: string;
  title: string;
};

export type SyncFlagItem = {
  registrationId: number;
  displayName: string;
  oaWhen: string;
  calendarWhen: string;
  reason: "rescheduled" | "canceled";
};

export type SyncPreview = {
  create: SyncCreateItem[];
  rescheduled: SyncFlagItem[];
  canceledOnCalendar: SyncFlagItem[];
  syncedCount: number;
  canceledWithoutEventCount: number;
};

export type SyncApplyResult = {
  created: Array<{ registrationId: number; eventId: string; notesDocUrl: string }>;
  errors: Array<{ registrationId: number; message: string }>;
  flaggedRescheduled: number;
  flaggedCanceled: number;
};

export type Snapshot = {
  tours: TourView[];
  log: NoShowLogEntry[];
  sheet: SheetLink | null;
  sheetWarning?: string;
};
