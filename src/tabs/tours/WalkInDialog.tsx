"use client";

import { useMemo, useState } from "react";
import { emptyWalkInInput } from "@/lib/walkin";
import { walkInFormFields, type WalkInField } from "@/tabs/tours/walkinForm.config";
import { DialogFrame } from "@/tabs/tours/dialogs";

export function WalkInDialog({
  busy,
  error,
  onClose,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(emptyWalkInInput);
  const sections = useMemo(() => {
    const grouped: Array<{ name: string; fields: WalkInField[] }> = [];
    for (const field of walkInFormFields) {
      const current = grouped.find((section) => section.name === field.section);
      if (current) current.fields.push(field);
      else grouped.push({ name: field.section, fields: [field] });
    }
    return grouped;
  }, []);

  return (
    <DialogFrame title="New walk-in tour" onClose={onClose} wide>
      <form
        className="px-5 py-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(values);
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">Tours / Visits</p>
        <h2 className="font-title text-4xl leading-none text-navy-900">New walk-in tour</h2>
        <p className="mt-2 text-sm text-[#3e556c]">
          Books a two-hour visit starting at the next quarter-hour, ICT. The calendar title is Walk-in - First
          (Preferred) Last (Grade). Guests are invited once. No Google Meet link is added. The row is logged with
          source Walk-in.
        </p>
        <div className="mt-4 space-y-4">
          {sections.map((section) => (
            <fieldset key={section.name}>
              <legend className="font-heading text-lg text-navy-900">{section.name}</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <label key={field.name} className={`text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
                    <span className="font-semibold">
                      {field.label}
                      {field.required ? "" : " (optional)"}
                    </span>
                    <Field
                      field={field}
                      value={values[field.name] ?? ""}
                      onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        {error ? <p className="mt-3 text-sm text-[#8d2f2f]">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded border border-[#d5dee8] px-3 py-2 text-sm" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy} className="rounded bg-navy-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Booking…" : "Book walk-in tour"}
          </button>
        </div>
      </form>
    </DialogFrame>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: WalkInField;
  value: string;
  onChange: (value: string) => void;
}) {
  const className = "mt-1 w-full rounded border border-[#d5dee8] px-2 py-2 font-sans";
  if (field.type === "textarea") {
    return (
      <textarea
        className={className}
        rows={3}
        required={field.required}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select className={className} required={field.required} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {(field.options ?? []).map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      className={className}
      type={field.type}
      required={field.required}
      placeholder={field.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
