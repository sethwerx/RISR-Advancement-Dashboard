"use client";

import { useRef } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { OfficeChart } from "@/lib/office/types";
import { ExportBrandHeader } from "@/components/shell/BrandLogo";
import { downloadPdf, downloadPng } from "@/tabs/tours/export-chart";

export function OfficeChartWindow({ chart, onClose }: { chart: OfficeChart; onClose: () => void }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <section ref={ref} className="no-print fixed bottom-6 right-6 z-40 w-[min(520px,calc(100vw-2rem))] rounded-lg border border-[#d5dee8] bg-white p-4 shadow-2xl">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <ExportBrandHeader label={chart.title} />
          <h2 className="font-heading text-2xl text-navy-900">{chart.title}</h2>
        </div>
        <div className="export-hide flex gap-1">
          <button type="button" className="rounded border border-[#d5dee8] px-2 py-1 text-xs" onClick={() => ref.current && downloadPng(ref.current, chart.id)}>
            PNG
          </button>
          <button type="button" className="rounded border border-[#d5dee8] px-2 py-1 text-xs" onClick={() => ref.current && downloadPdf(ref.current, chart.id)}>
            PDF
          </button>
          <button type="button" className="rounded bg-navy-900 px-2 py-1 text-xs text-white" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.points}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-25} height={70} textAnchor="end" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" fill="#23355D" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
