import { gradeRank, isConvertedStatus } from "@/lib/constants";
import { representativeTourStatus } from "@/lib/merge";
import { formatMonthKey } from "@/lib/time";
import type { TourView } from "@/lib/types";

export type MonthBucket = {
  month: string;
  label: string;
  attended: number;
  noShow: number;
  canceled: number;
  upcoming: number;
};

export type AnalyticsModel = {
  toursPerMonth: MonthBucket[];
  showRate: { attended: number; noShow: number; pastScheduled: number };
  canceledRate: { canceled: number; kept: number; total: number };
  conversion: {
    converted: number;
    notConverted: number;
    byStatus: { status: string; count: number }[];
  };
  leadSources: { source: string; count: number }[];
  gradeMix: { grade: string; count: number }[];
  hostLoad: { host: string; count: number }[];
};

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function computeAnalytics(tours: TourView[], now = new Date()): AnalyticsModel {
  const nowMs = now.getTime();
  const months = new Map<string, MonthBucket>();
  const showRate = { attended: 0, noShow: 0, pastScheduled: 0 };
  let canceled = 0;
  const statusCounts = new Map<string, number>();
  let converted = 0;
  let notConverted = 0;
  const sources = new Map<string, number>();
  const grades = new Map<string, number>();
  const hosts = new Map<string, number>();

  for (const tour of tours) {
    const { key, label } = formatMonthKey(tour.date);
    const bucket = months.get(key) ?? { month: key, label, attended: 0, noShow: 0, canceled: 0, upcoming: 0 };
    const start = Date.parse(tour.startIso);
    const isPast = start < nowMs;
    if (tour.state === "canceled") {
      canceled += 1;
      bucket.canceled += 1;
    } else if (tour.noShow) {
      bucket.noShow += 1;
      if (isPast) {
        showRate.noShow += 1;
        showRate.pastScheduled += 1;
      }
    } else if (isPast) {
      bucket.attended += 1;
      showRate.attended += 1;
      showRate.pastScheduled += 1;
    } else {
      bucket.upcoming += 1;
    }
    months.set(key, bucket);

    if (tour.state !== "canceled") {
      const status = representativeTourStatus(tour);
      bump(statusCounts, status);
      if (isConvertedStatus(status)) converted += 1;
      else notConverted += 1;
      bump(sources, tour.notes?.leadSource?.trim() || tour.inquirySource?.trim() || "Not recorded");
      bump(hosts, tour.host.trim() || "Unassigned");
      for (const student of tour.students) bump(grades, student.grade || "Ungraded");
    }
  }

  const byStatus = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

  return {
    toursPerMonth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    showRate,
    canceledRate: { canceled, kept: tours.length - canceled, total: tours.length },
    conversion: { converted, notConverted, byStatus },
    leadSources: [...sources.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
    gradeMix: [...grades.entries()]
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade) || a.grade.localeCompare(b.grade)),
    hostLoad: [...hosts.entries()]
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count || a.host.localeCompare(b.host)),
  };
}

export function percent(part: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}
