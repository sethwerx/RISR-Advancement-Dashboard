import { dashboardConfig, tourEventLabel } from "@/config/dashboard.config";
import { formatNotesBlock, initialNotesDocBody } from "@/lib/notes-format";
import { buildDescription, buildTourTitle, formatPersonName, notesDocumentName, studentProfileUrl } from "@/lib/title";
import { tourInterval } from "@/lib/time";
import type {
  CalendarEvent,
  HydratedRegistration,
  NoShowAction,
  NoShowLogEntry,
  NotesDoc,
  TourNotes,
} from "@/lib/types";

export const STORE_VERSION = 1;

type SeedStudent = {
  id: number;
  firstName: string;
  preferredName?: string;
  lastName: string;
  grade: string;
  status: string;
  thaiNickname?: string;
};

type SeedNote = Omit<TourNotes, "registrationId">;

type Story = {
  id: number;
  eventId: number;
  date: string;
  time: string;
  state: "scheduled" | "canceled";
  host: string;
  note?: string;
  students: SeedStudent[];
  calendar?: { date: string; time: string; noShow?: boolean; legacy?: boolean };
  notes?: SeedNote;
  log?: Array<{ action: NoShowAction; at: string }>;
};

function stu(
  id: number,
  firstName: string,
  preferredName: string,
  lastName: string,
  grade: string,
  status: string,
  thaiNickname = "",
): SeedStudent {
  return { id, firstName, preferredName, lastName, grade, status, thaiNickname };
}

function noted(
  gradeOfInterest: string,
  leadSource: string,
  interestLevel: number,
  concerns: string[],
  nextStep: string,
  tourGuide: string,
  comment: string,
  updatedAt: string,
  concernOther = "",
): SeedNote {
  return {
    gradeOfInterest,
    leadSource,
    interestLevel,
    concerns,
    concernOther,
    nextStep,
    tourGuide,
    comment,
    updatedAt,
  };
}

const stories: Story[] = [
  {
    id: 88001,
    eventId: 22965,
    date: "2026-11-03",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    note: "First visit. Asked about the English programme.",
    students: [stu(51001, "Linnea", "", "Bergstrom", "G6", "Inquiry")],
  },
  {
    id: 88002,
    eventId: 22965,
    date: "2026-11-06",
    time: "1:00 PM",
    state: "scheduled",
    host: "Riley Quinn",
    note: "Siblings. Family asked to move the visit off the original morning.",
    students: [
      stu(51002, "Mateo", "Teo", "Duarte", "G9", "Applied"),
      stu(51003, "Camila", "", "Duarte", "G4", "Inquiry"),
    ],
    calendar: { date: "2026-10-30", time: "10:00 AM" },
  },
  {
    id: 88003,
    eventId: 22964,
    date: "2026-11-09",
    time: "9:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    note: "Younger sibling may join a later visit.",
    students: [stu(51004, "Hanae", "Hana", "Mori", "G1", "Inquiry", "ฮานะ")],
    calendar: { date: "2026-11-09", time: "9:00 AM" },
  },
  {
    id: 88004,
    eventId: 22965,
    date: "2026-11-12",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51005, "Omar", "", "Haddad", "G7", "Applied")],
    calendar: { date: "2026-11-12", time: "10:00 AM" },
  },
  {
    id: 88005,
    eventId: 22965,
    date: "2026-11-17",
    time: "2:30 PM",
    state: "scheduled",
    host: "Jordan Blake",
    students: [stu(51006, "Freya", "", "Lindgren", "G3", "Inquiry")],
    calendar: { date: "2026-11-17", time: "2:30 PM" },
  },
  {
    id: 88006,
    eventId: 22965,
    date: "2026-11-20",
    time: "10:00 AM",
    state: "canceled",
    host: "Riley Quinn",
    note: "Family canceled. The calendar event is still there and must not be deleted from here.",
    students: [stu(51007, "Noah", "", "Bennett", "G5", "Inquiry")],
    calendar: { date: "2026-11-20", time: "10:00 AM" },
  },
  {
    id: 88007,
    eventId: 22964,
    date: "2026-11-25",
    time: "1:00 PM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [
      stu(51008, "Idris", "Idy", "Okonkwo", "G2", "Inquiry", "ไอดี้"),
      stu(51009, "Zola", "", "Okonkwo", "KG", "Inquiry"),
    ],
    calendar: { date: "2026-11-25", time: "1:00 PM" },
  },
  {
    id: 88008,
    eventId: 22965,
    date: "2026-12-03",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51010, "Mei", "", "Calderon", "G10", "Admitted")],
    calendar: { date: "2026-12-03", time: "10:00 AM" },
  },
  {
    id: 88009,
    eventId: 22964,
    date: "2026-12-09",
    time: "9:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    note: "PreK. Not on the calendar yet.",
    students: [stu(51011, "Hugo", "", "Pereira", "PreK", "Inquiry")],
  },
  {
    id: 88010,
    eventId: 22965,
    date: "2026-12-15",
    time: "1:00 PM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51012, "Soren", "", "Ibarra", "G4", "Applied")],
    calendar: { date: "2026-12-15", time: "1:00 PM" },
  },
  {
    id: 88011,
    eventId: 22965,
    date: "2027-01-08",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [stu(51013, "Amira", "", "Yusuf", "G8", "Applied")],
    calendar: { date: "2027-01-08", time: "10:00 AM" },
  },
  {
    id: 88012,
    eventId: 24622,
    date: "2027-01-14",
    time: "2:30 PM",
    state: "scheduled",
    host: "Samira Nunez",
    note: "School-break visit.",
    students: [stu(51014, "Niklas", "Nik", "Andersen", "G11", "Inquiry")],
    calendar: { date: "2027-01-14", time: "2:30 PM" },
  },
  {
    id: 88013,
    eventId: 22964,
    date: "2027-01-21",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    students: [stu(51015, "Chloe", "", "Moreau", "KG", "Inquiry")],
    calendar: { date: "2027-01-21", time: "10:00 AM" },
  },
  {
    id: 88014,
    eventId: 22965,
    date: "2027-02-04",
    time: "9:00 AM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51016, "Elena", "", "Vasquez", "G9", "Inquiry")],
    calendar: { date: "2027-02-04", time: "9:00 AM" },
  },
  {
    id: 88016,
    eventId: 22965,
    date: "2026-10-28",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    note: "Did not arrive. Attendance still needs to be marked in OpenApply.",
    students: [stu(51017, "Elias", "Eli", "Novak", "G8", "Inquiry")],
    calendar: { date: "2026-10-28", time: "10:00 AM", noShow: true },
    log: [{ action: "No Show", at: "2026-10-28T11:10:00+07:00" }],
  },
  {
    id: 88017,
    eventId: 22964,
    date: "2026-10-22",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [
      stu(51018, "Amina", "Mimi", "Okello", "G2", "Applied", "มินิ"),
      stu(51019, "Jonah", "", "Okello", "KG", "Inquiry"),
    ],
    calendar: { date: "2026-10-22", time: "10:00 AM" },
    notes: noted(
      "G2",
      "Current family referral",
      4,
      ["Language support", "Class size"],
      "Send application link",
      "Alex Morgan",
      "Older child is the priority. Younger child is still exploring KG.",
      "2026-10-22T12:20:00+07:00",
    ),
  },
  {
    id: 88018,
    eventId: 22965,
    date: "2026-10-21",
    time: "1:00 PM",
    state: "canceled",
    host: "Samira Nunez",
    note: "Canceled after the invite went out.",
    students: [stu(51020, "Tariq", "", "Ellison", "G6", "Inquiry")],
    calendar: { date: "2026-10-21", time: "1:00 PM" },
  },
  {
    id: 88019,
    eventId: 22964,
    date: "2026-10-14",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    note: "OA date moved. Calendar still shows the previous week.",
    students: [stu(51021, "Naomi", "", "Berg", "G1", "Applied")],
    calendar: { date: "2026-10-07", time: "10:00 AM" },
  },
  {
    id: 88020,
    eventId: 22965,
    date: "2026-10-08",
    time: "1:00 PM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51022, "Leo", "", "Marchetti", "G5", "Enrolled")],
    calendar: { date: "2026-10-08", time: "1:00 PM" },
    notes: noted(
      "G5",
      "Relocation company",
      5,
      ["Transport"],
      "Enroll next term",
      "Riley Quinn",
      "Relocating in December. Asked about the bus from the river side.",
      "2026-10-08T15:10:00+07:00",
    ),
  },
  {
    id: 88021,
    eventId: 22965,
    date: "2026-09-29",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51023, "Hana", "", "Solberg", "G2", "Applied")],
    calendar: { date: "2026-09-29", time: "10:00 AM" },
    notes: noted(
      "G2",
      "School website",
      4,
      ["Academic programme"],
      "Wait for documents",
      "Samira Nunez",
      "Wants the bilingual reading list before applying.",
      "2026-09-29T12:05:00+07:00",
    ),
  },
  {
    id: 88022,
    eventId: 22965,
    date: "2026-09-23",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    note: "Older calendar event, matched by name and date.",
    students: [stu(51024, "Ines", "", "Navarro", "G4", "Admitted")],
    calendar: { date: "2026-09-23", time: "10:00 AM", legacy: true },
    notes: noted(
      "G4",
      "Education agent",
      5,
      ["University counselling"],
      "Send application link",
      "Alex Morgan",
      "Agent sat in. Family is comparing two schools.",
      "2026-09-23T12:30:00+07:00",
    ),
  },
  {
    id: 88023,
    eventId: 22965,
    date: "2026-09-16",
    time: "9:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    students: [stu(51025, "Marcus", "", "Adeyemi", "G9", "Inquiry")],
    calendar: { date: "2026-09-16", time: "9:00 AM", noShow: true },
    log: [
      { action: "No Show", at: "2026-09-16T11:20:00+07:00" },
      { action: "OA updated", at: "2026-09-16T11:35:00+07:00" },
    ],
    notes: noted(
      "G9",
      "Social media",
      2,
      ["Commute"],
      "Not proceeding",
      "Jordan Blake",
      "No show. Family later said the commute was too far.",
      "2026-09-16T11:40:00+07:00",
    ),
  },
  {
    id: 88024,
    eventId: 23638,
    date: "2026-09-09",
    time: "10:00 AM",
    state: "scheduled",
    host: "Riley Quinn",
    note: "Booked on the previous PreK/KG 10am event.",
    students: [stu(51026, "Yuna", "", "Park", "KG", "Applied")],
    calendar: { date: "2026-09-09", time: "10:00 AM" },
    notes: noted(
      "KG",
      "Open house",
      4,
      ["Class size", "After-school activities"],
      "Campus shadow day",
      "Riley Quinn",
      "Met the KG team at the open house and wanted a closer look.",
      "2026-09-09T12:15:00+07:00",
    ),
  },
  {
    id: 88025,
    eventId: 22965,
    date: "2026-09-02",
    time: "1:00 PM",
    state: "canceled",
    host: "Alex Morgan",
    note: "Canceled before a calendar event was created.",
    students: [stu(51027, "Felix", "", "Ortega", "G3", "Inquiry")],
  },
  {
    id: 88026,
    eventId: 22965,
    date: "2026-08-26",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    note: "Happened, but nobody copied it onto the calendar.",
    students: [stu(51028, "Aisha", "", "Rahman", "G7", "Inquiry")],
  },
  {
    id: 88027,
    eventId: 22965,
    date: "2026-08-20",
    time: "2:30 PM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51029, "Peter", "", "Novotny", "G10", "Declined")],
    calendar: { date: "2026-08-20", time: "2:30 PM", noShow: true },
    log: [
      { action: "No Show", at: "2026-08-20T16:40:00+07:00" },
      { action: "OA updated", at: "2026-08-20T17:05:00+07:00" },
    ],
  },
  {
    id: 88028,
    eventId: 22965,
    date: "2026-08-12",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [
      stu(51030, "Lara", "", "Silva", "G6", "Applied"),
      stu(51031, "Bruno", "", "Silva", "G3", "Applied"),
    ],
    calendar: { date: "2026-08-12", time: "10:00 AM" },
    notes: noted(
      "G6",
      "Embassy / corporate HR",
      4,
      ["Tuition / fees", "Language support"],
      "Schedule follow-up call",
      "Alex Morgan",
      "Corporate relocation. Asked about fee support and EAL.",
      "2026-08-12T12:25:00+07:00",
    ),
  },
  {
    id: 88029,
    eventId: 22964,
    date: "2026-08-05",
    time: "9:00 AM",
    state: "canceled",
    host: "Jordan Blake",
    students: [stu(51032, "Owen", "", "Grant", "PreK", "Inquiry")],
    calendar: { date: "2026-08-05", time: "9:00 AM" },
  },
  {
    id: 88030,
    eventId: 22964,
    date: "2026-07-22",
    time: "10:00 AM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51033, "Nadia", "", "Costa", "G1", "Inquiry")],
  },
  {
    id: 88031,
    eventId: 22965,
    date: "2026-07-15",
    time: "1:00 PM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51034, "Samir", "", "Farsi", "G8", "Waitlisted")],
    calendar: { date: "2026-07-15", time: "1:00 PM" },
    notes: noted(
      "G8",
      "Education agent",
      3,
      ["Academic programme", "University counselling"],
      "Wait for documents",
      "Riley Quinn",
      "Strong interest. Waiting on school reports from the previous school.",
      "2026-07-15T15:00:00+07:00",
    ),
  },
  {
    id: 88032,
    eventId: 22965,
    date: "2026-07-08",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51035, "Eva", "", "Lindholm", "G2", "Enrolled")],
    calendar: { date: "2026-07-08", time: "10:00 AM" },
    notes: noted(
      "G2",
      "Current family referral",
      5,
      ["After-school activities"],
      "Enroll next term",
      "Samira Nunez",
      "Referred by a current G4 family. Ready to enrol.",
      "2026-07-08T12:10:00+07:00",
    ),
  },
  {
    id: 88033,
    eventId: 22965,
    date: "2026-06-25",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    students: [stu(51036, "Mina", "", "Cho", "G5", "Inquiry")],
    calendar: { date: "2026-06-25", time: "10:00 AM" },
    notes: noted(
      "G5",
      "Walk-in",
      3,
      ["Commute", "Transport"],
      "Schedule follow-up call",
      "Jordan Blake",
      "Walked in after a campus errand. Curious, not ready to apply.",
      "2026-06-25T12:00:00+07:00",
    ),
  },
  {
    id: 88034,
    eventId: 22965,
    date: "2026-06-18",
    time: "1:00 PM",
    state: "canceled",
    host: "Alex Morgan",
    students: [stu(51037, "Paul", "", "Berger", "G11", "Inquiry")],
  },
  {
    id: 88035,
    eventId: 22965,
    date: "2026-06-10",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [stu(51038, "Aya", "", "Demir", "G4", "Applied")],
    calendar: { date: "2026-06-10", time: "10:00 AM" },
    notes: noted(
      "G4",
      "School website",
      4,
      ["Tuition / fees"],
      "Send application link",
      "Alex Morgan",
      "Asked for the fee schedule and the application timeline.",
      "2026-06-10T12:18:00+07:00",
    ),
  },
  {
    id: 88036,
    eventId: 22965,
    date: "2026-10-02",
    time: "2:30 PM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51039, "Leila", "", "Santos", "G11", "Admitted")],
    calendar: { date: "2026-10-02", time: "2:30 PM" },
    notes: noted(
      "G11",
      "Education agent",
      5,
      ["University counselling", "Academic programme"],
      "Enroll next term",
      "Riley Quinn",
      "IB-style questions. Admitted the following week.",
      "2026-10-02T16:40:00+07:00",
    ),
  },
  {
    id: 88037,
    eventId: 22965,
    date: "2026-09-30",
    time: "10:00 AM",
    state: "scheduled",
    host: "Samira Nunez",
    students: [stu(51040, "Emma", "", "Dahl", "G12", "Enrolled")],
    calendar: { date: "2026-09-30", time: "10:00 AM" },
    notes: noted(
      "G12",
      "Relocation company",
      5,
      ["University counselling"],
      "Enroll next term",
      "Samira Nunez",
      "One-year placement. Enrolment completed.",
      "2026-09-30T12:12:00+07:00",
    ),
  },
  {
    id: 88038,
    eventId: 22965,
    date: "2026-08-18",
    time: "1:00 PM",
    state: "scheduled",
    host: "Jordan Blake",
    students: [stu(51041, "Victor", "", "Alem", "G9", "Declined")],
    calendar: { date: "2026-08-18", time: "1:00 PM" },
    notes: noted(
      "G9",
      "Social media",
      2,
      ["Tuition / fees", "Commute"],
      "Not proceeding",
      "Jordan Blake",
      "Liked the campus. Chose a school closer to the new apartment.",
      "2026-08-18T15:20:00+07:00",
    ),
  },
  {
    id: 88039,
    eventId: 22965,
    date: "2026-07-29",
    time: "10:00 AM",
    state: "scheduled",
    host: "Alex Morgan",
    students: [stu(51042, "Sara", "", "Iqbal", "G7", "Waitlisted")],
    calendar: { date: "2026-07-29", time: "10:00 AM" },
    notes: noted(
      "G7",
      "Open house",
      4,
      ["Class size"],
      "Wait for documents",
      "Alex Morgan",
      "Waitlisted for the grade. Happy to stay in touch.",
      "2026-07-29T12:08:00+07:00",
    ),
  },
  {
    id: 88040,
    eventId: 22965,
    date: "2026-06-04",
    time: "9:00 AM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51043, "Tomas", "", "Rivera", "G3", "Withdrawn")],
    calendar: { date: "2026-06-04", time: "9:00 AM" },
    notes: noted(
      "G3",
      "Walk-in",
      3,
      ["Other"],
      "Not proceeding",
      "Riley Quinn",
      "Started an application, then the posting was cancelled.",
      "2026-06-04T11:30:00+07:00",
      "Posting cancelled",
    ),
  },
  {
    id: 88041,
    eventId: 24622,
    date: "2026-12-22",
    time: "10:00 AM",
    state: "scheduled",
    host: "Jordan Blake",
    note: "Second school-break visit.",
    students: [stu(51044, "Noor", "", "Farouk", "G5", "Inquiry")],
    calendar: { date: "2026-12-22", time: "10:00 AM" },
  },
  {
    id: 88042,
    eventId: 23638,
    date: "2026-08-11",
    time: "10:00 AM",
    state: "scheduled",
    host: "Riley Quinn",
    students: [stu(51045, "Pim", "Peach", "Siriwat", "KG", "Applied")],
    calendar: { date: "2026-08-11", time: "10:00 AM" },
    notes: noted(
      "KG",
      "School website",
      4,
      ["Language support"],
      "Send application link",
      "Riley Quinn",
      "Preferred name is Peach. KG application is in progress.",
      "2026-08-11T12:05:00+07:00",
    ),
  },
];

export type SeedBundle = {
  version: number;
  registrations: HydratedRegistration[];
  events: CalendarEvent[];
  notes: TourNotes[];
  log: NoShowLogEntry[];
  docs: Record<string, NotesDoc>;
};

function parentFor(story: Story) {
  const last = story.students[0]?.lastName ?? "Family";
  return {
    name: `${last} family`,
    email: `family.${last.toLowerCase()}.${story.id}@example.com`,
    phone: "+66 00 000 0000",
    role: "Parent",
  };
}

export function buildSeedBundle(): SeedBundle {
  const duration = dashboardConfig.tours.durationMinutes;
  const registrations: HydratedRegistration[] = [];
  const events: CalendarEvent[] = [];
  const notes: TourNotes[] = [];
  const log: NoShowLogEntry[] = [];
  const docs: Record<string, NotesDoc> = {};

  for (const story of stories) {
    const students = story.students.map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      preferredName: student.preferredName ?? "",
      grade: student.grade,
      status: student.status,
      thaiNickname: student.thaiNickname ?? "",
      profileUrl: studentProfileUrl(student.id),
    }));
    registrations.push({
      id: story.id,
      eventId: story.eventId,
      eventLabel: tourEventLabel(story.eventId),
      date: story.date,
      time: story.time,
      state: story.state,
      host: story.host,
      campus: "Ratchapruek",
      note: story.note ?? "",
      attendeesCount: students.length + 1,
      students,
      parents: [parentFor(story)],
    });

    const displayName = students.map(formatPersonName).join(" & ");
    if (story.calendar) {
      const interval = tourInterval(story.calendar.date, story.calendar.time, duration);
      const titleStudents = students.map((student) => ({
        firstName: student.firstName,
        lastName: student.lastName,
        preferredName: student.preferredName,
        grade: student.grade,
      }));
      const docName = notesDocumentName(titleStudents);
      const docUrl = `sample://notes/${story.id}`;
      const title = story.calendar.legacy
        ? `School tour: ${titleStudents.map((student) => `${student.firstName} ${student.lastName} (${student.grade})`).join(" & ")}`
        : buildTourTitle(titleStudents, Boolean(story.calendar.noShow));
      const description = story.calendar.legacy
        ? `Campus visit for ${displayName}.`
        : buildDescription(
            students.map((student) => student.id),
            story.id,
          );
      events.push({
        id: `cal-${story.id}`,
        title,
        description,
        startIso: interval.start,
        endIso: interval.end,
        htmlLink: "",
        registrationId: story.calendar.legacy ? null : story.id,
        notesDocUrl: docUrl,
      });
      let body = initialNotesDocBody(docName);
      if (story.notes) {
        const saved: TourNotes = { ...story.notes, registrationId: story.id };
        body += `\n${formatNotesBlock({
          displayName,
          date: story.date,
          timeLabel: story.time,
          notes: saved,
        })}\n`;
      }
      docs[String(story.id)] = { name: docName, url: docUrl, body };
    }

    if (story.notes) notes.push({ ...story.notes, registrationId: story.id });
    story.log?.forEach((entry, index) => {
      log.push({
        id: `log-${story.id}-${index + 1}`,
        at: entry.at,
        registrationId: story.id,
        studentNames: displayName,
        action: entry.action,
        actor: dashboardConfig.ui.userDisplayName,
        calendarEventId: `cal-${story.id}`,
      });
    });
  }

  return { version: STORE_VERSION, registrations, events, notes, log, docs };
}
