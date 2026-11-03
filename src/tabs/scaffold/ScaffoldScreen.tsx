/**
 * Shared layout for tabs that are registered but not wired to a data source yet.
 */
export function ScaffoldScreen({
  title,
  description,
  columns,
  rows,
  summary,
}: {
  title: string;
  description: string;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
  summary?: string;
}) {
  return (
    <div>
      <h1 className="font-title text-5xl leading-none text-navy-900">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-[#3e556c]">{description}</p>
      <section className="mt-4 rounded-lg border border-[#d5dee8] bg-white px-5 py-6">
        <h2 className="font-heading text-2xl text-navy-900">Coming soon</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#3e556c]">
          This tab is a scaffold. Live data is not connected yet. The table below is fictional sample data.
        </p>
      </section>
      {summary ? <p className="mt-4 text-sm font-semibold text-navy-900">{summary}</p> : null}
      <div className="mt-3 overflow-x-auto rounded-lg border border-[#d5dee8] bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-[#5c7388]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("|")} className="border-t border-[#d5dee8]">
                {row.map((cell, index) => (
                  <td key={`${columns[index]}-${cell}`} className="px-3 py-2">
                    {cell || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
