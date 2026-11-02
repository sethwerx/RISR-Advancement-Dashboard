import type { TabDefinition } from "@/tabs/types";

export function ComingSoon({ tab }: { tab: TabDefinition }) {
  return (
    <section className="rounded-lg border border-[#d5dee8] bg-white px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5c7388]">Reserved tab</p>
      <h1 className="mt-2 font-display text-4xl text-navy-900">{tab.label}</h1>
      <p className="mt-3 max-w-xl text-[#3e556c]">{tab.description}</p>
      <p className="mt-6 max-w-xl text-sm text-[#3e556c]">
        The shell already has a slot for this section. Add a folder under <code>src/tabs</code> and one entry in the
        tab registry when it is ready. See the README.
      </p>
    </section>
  );
}
