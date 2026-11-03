"use client";

import { useRef, useState } from "react";
import { ExportBrandHeader } from "@/components/shell/BrandLogo";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeAnalytics, percent } from "@/lib/analytics";
import type { TourView } from "@/lib/types";
import { downloadPdf, downloadPng } from "@/tabs/tours/export-chart";

const NAVY = "#23355D";
const TERRACOTTA = "#8d3b2f";
const STONE = "#8a7340";
const STEEL = "#3d6f99";
const SLATE = "#8aa0b8";

export function AnalyticsPanel({
  tours,
  docked,
  matchFilters,
  onToggleFilters,
  onToggleDock,
  onClose,
}: {
  tours: TourView[];
  docked: boolean;
  matchFilters: boolean;
  onToggleFilters: () => void;
  onToggleDock: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 48, y: 92 });
  const [exportError, setExportError] = useState("");
  const model = computeAnalytics(tours);

  async function exportNode(node: HTMLElement | null, kind: "png" | "pdf", filename: string) {
    if (!node) return;
    setExportError("");
    try {
      if (kind === "png") await downloadPng(node, filename);
      else await downloadPdf(node, filename);
    } catch {
      setExportError("The export did not finish. Try again.");
    }
  }

  function onDragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (docked) return;
    const originX = event.clientX;
    const originY = event.clientY;
    const start = position;
    function move(next: PointerEvent) {
      setPosition({
        x: Math.max(8, start.x + next.clientX - originX),
        y: Math.max(8, start.y + next.clientY - originY),
      });
    }
    function up() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <section
      role="dialog"
      aria-label="Tour analytics"
      className={
        docked
          ? "no-print fixed inset-y-0 right-0 z-40 flex w-full max-w-[440px] flex-col border-l border-[#d5dee8] bg-[#f7f9fb] shadow-xl lg:static lg:z-auto lg:max-h-[calc(100vh-8rem)] lg:w-[420px] lg:shrink-0 lg:shadow-none"
          : "no-print fixed z-40 flex max-h-[calc(100vh-4rem)] w-[min(860px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-lg border border-[#d5dee8] bg-[#f7f9fb] shadow-2xl"
      }
      style={docked ? undefined : { left: position.x, top: position.y }}
    >
      <div
        ref={panelRef}
        className="flex min-h-0 flex-1 flex-col"
      >
        <header
          className="flex cursor-grab items-start justify-between gap-3 border-b border-[#d5dee8] bg-navy-900 px-4 py-3 text-white"
          onPointerDown={onDragStart}
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Tours/Visits</p>
            <h2 className="font-title text-4xl leading-none">Analytics</h2>
          </div>
          <div className="export-hide flex flex-wrap justify-end gap-1">
            <button type="button" className="rounded bg-white/10 px-2 py-1 text-xs" onClick={onToggleFilters}>
              {matchFilters ? "Using filters" : "All tours"}
            </button>
            <button type="button" className="rounded bg-white/10 px-2 py-1 text-xs" onClick={onToggleDock}>
              {docked ? "Float" : "Dock to side"}
            </button>
            <button type="button" className="rounded bg-white/10 px-2 py-1 text-xs" onClick={() => exportNode(panelRef.current, "png", "risr-tour-analytics")}>
              Panel PNG
            </button>
            <button type="button" className="rounded bg-white/10 px-2 py-1 text-xs" onClick={() => exportNode(panelRef.current, "pdf", "risr-tour-analytics")}>
              Panel PDF
            </button>
            <button type="button" className="rounded bg-white px-2 py-1 text-xs font-semibold text-navy-900" onClick={onClose}>
              Close
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {exportError ? <p className="text-sm text-[#8d2f2f]">{exportError}</p> : null}
          <p className="text-xs text-[#5c7388]">
            Show rate counts past scheduled tours. A tour without a no-show tag is Attended. Conversion means
            at least one child has moved past inquiry. Times are Asia/Bangkok.
          </p>
          <div className={docked ? "grid gap-3" : "grid gap-3 md:grid-cols-2"}>
            <ChartCard title="Tours per month" caption="Scheduled visits, no-shows, cancellations, and tours still ahead." filename="risr-tours-per-month" onExport={exportNode}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.toursPerMonth}>
                    <CartesianGrid stroke="#e4ebf2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attended" stackId="tours" fill={NAVY} name="Attended" />
                    <Bar dataKey="noShow" stackId="tours" fill={TERRACOTTA} name="No show" />
                    <Bar dataKey="canceled" stackId="tours" fill={STONE} name="Canceled" />
                    <Bar dataKey="upcoming" stackId="tours" fill={STEEL} name="Upcoming" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard
              title="Attended vs no-show"
              caption={`${percent(model.showRate.noShow, model.showRate.pastScheduled)} no-show · ${model.showRate.noShow} of ${model.showRate.pastScheduled} past scheduled tours.`}
              filename="risr-attended-rate"
              onExport={exportNode}
            >
              <RatePie
                slices={[
                  { name: "Attended", value: model.showRate.attended, fill: NAVY },
                  { name: "No show", value: model.showRate.noShow, fill: TERRACOTTA },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Canceled rate"
              caption={`${percent(model.canceledRate.canceled, model.canceledRate.total)} canceled · ${model.canceledRate.canceled} of ${model.canceledRate.total} registrations.`}
              filename="risr-canceled-rate"
              onExport={exportNode}
            >
              <RatePie
                slices={[
                  { name: "Kept", value: model.canceledRate.kept, fill: NAVY },
                  { name: "Canceled", value: model.canceledRate.canceled, fill: STONE },
                ]}
              />
            </ChartCard>
            <ChartCard
              title="Tour to application"
              caption={`${percent(model.conversion.converted, model.conversion.converted + model.conversion.notConverted)} of non-canceled tours have left inquiry.`}
              filename="risr-conversion"
              onExport={exportNode}
            >
              <RatePie
                slices={[
                  { name: "In pipeline", value: model.conversion.converted, fill: NAVY },
                  { name: "Still inquiry", value: model.conversion.notConverted, fill: SLATE },
                ]}
              />
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.conversion.byStatus} layout="vertical" margin={{ left: 16 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis type="category" dataKey="status" width={84} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={STEEL} name="Tours" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Lead sources" caption="From structured tour notes. Blank notes are “Not recorded”." filename="risr-lead-sources" onExport={exportNode}>
              <CategoryBars data={model.leadSources} nameKey="source" />
            </ChartCard>
            <ChartCard title="Grade mix" caption="Each child on a non-canceled registration is counted." filename="risr-grade-mix" onExport={exportNode}>
              <CategoryBars data={model.gradeMix} nameKey="grade" />
            </ChartCard>
            <ChartCard title="Host load" caption="Non-canceled registrations by the OpenApply host." filename="risr-host-load" onExport={exportNode}>
              <CategoryBars data={model.hostLoad} nameKey="host" />
            </ChartCard>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  caption,
  filename,
  onExport,
  children,
}: {
  title: string;
  caption: string;
  filename: string;
  onExport: (node: HTMLElement | null, kind: "png" | "pdf", filename: string) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <article ref={ref} className="rounded-lg border border-[#d5dee8] bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <ExportBrandHeader label={title} />
          <h3 className="font-heading text-xl leading-tight text-navy-900">{title}</h3>
          <p className="mt-1 text-xs text-[#5c7388]">{caption}</p>
        </div>
        <div className="export-hide flex gap-1">
          <button type="button" className="rounded border border-[#d5dee8] px-2 py-1 text-[11px] font-semibold" onClick={() => onExport(ref.current, "png", filename)}>
            PNG
          </button>
          <button type="button" className="rounded border border-[#d5dee8] px-2 py-1 text-[11px] font-semibold" onClick={() => onExport(ref.current, "pdf", filename)}>
            PDF
          </button>
        </div>
      </div>
      {children}
    </article>
  );
}

function RatePie({ slices }: { slices: Array<{ name: string; value: number; fill: string }> }) {
  const visible = slices.filter((slice) => slice.value > 0);
  if (visible.length === 0) return <p className="py-8 text-sm text-[#5c7388]">Nothing in this view yet.</p>;
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={visible} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={2}>
            {visible.map((slice) => (
              <Cell key={slice.name} fill={slice.fill} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryBars({
  data,
  nameKey,
}: {
  data: Array<{ count: number; source?: string; grade?: string; host?: string }>;
  nameKey: "source" | "grade" | "host";
}) {
  if (data.length === 0) return <p className="py-8 text-sm text-[#5c7388]">Nothing in this view yet.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 8 }}>
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey={nameKey} width={120} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" fill={NAVY} name="Tours" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
