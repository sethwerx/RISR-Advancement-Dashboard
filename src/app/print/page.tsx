"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExportBrandHeader } from "@/components/shell/BrandLogo";
import { dashboardConfig } from "@/config/dashboard.config";
import { attendanceLabel } from "@/lib/attendance";
import { STATE_LABEL, SYNC_LABEL } from "@/lib/constants";
import { defaultMeetingWindow, formatIctTimestamp, formatLongDate } from "@/lib/time";
import type { TourView, ToursResponse } from "@/lib/types";

export default function PrintPage() {
  const meetingWindow = useMemo(() => defaultMeetingWindow(), []);
  const [from, setFrom] = useState(meetingWindow.from);
  const [to, setTo] = useState(meetingWindow.to);
  const [tours, setTours] = useState<TourView[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tours", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as ToursResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || "Could not load tours.");
        setTours(payload.tours);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load tours."));
  }, []);

  const rows = tours
    .filter((tour) => tour.date >= from && tour.date <= to)
    .sort((a, b) => a.startIso.localeCompare(b.startIso));

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-sm font-semibold text-navy-800 underline">
            Back to tours
          </Link>
          <h1 className="mt-2 font-title text-5xl leading-none text-navy-900">Tours/Visits print view</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#3e556c]">
            Landscape, frozen header, and fit to the page width. Choose the Tours/Visits date range, then print.
          </p>
        </div>
        <button type="button" className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => window.print()}>
          Print
        </button>
      </div>
      <div className="no-print mb-4 flex flex-wrap gap-3">
        <label className="text-sm">
          From
          <input className="ml-2 rounded border border-[#d5dee8] px-2 py-1" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm">
          To
          <input className="ml-2 rounded border border-[#d5dee8] px-2 py-1" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </div>
      {error ? <p className="text-sm text-[#8d2f2f]">{error}</p> : null}
      <ExportBrandHeader label="Tours/Visits sheet" />
      <header className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">{dashboardConfig.ui.productName}</p>
        <h2 className="font-heading text-2xl">Tours/Visits sheet</h2>
        <p className="text-sm text-[#3e556c]">
          {from} to {to} · {dashboardConfig.school.timezone} · Printed {formatIctTimestamp(new Date().toISOString())}
        </p>
      </header>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-navy-900 text-white">
          <tr>
            {["Date", "Time", "Students", "Grade", "Host", "OA status", "State", "Calendar", "Attendance", "Next step"].map((header) => (
              <th key={header} className="border border-navy-900 px-2 py-2 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((tour) => (
            <tr key={tour.registrationId} className="odd:bg-[#f7fafc]">
              <td className="border border-[#d5dee8] px-2 py-1">{formatLongDate(tour.date)}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.timeLabel}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.displayName}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.gradesLabel}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.host}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.statusLabel}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{STATE_LABEL[tour.state]}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{SYNC_LABEL[tour.syncStatus]}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{attendanceLabel(tour)}</td>
              <td className="border border-[#d5dee8] px-2 py-1">{tour.notes?.nextStep ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <p className="mt-3 text-sm text-[#5c7388]">No tours in this date range.</p> : null}
    </div>
  );
}
