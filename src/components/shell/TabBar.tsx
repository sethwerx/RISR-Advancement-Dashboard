"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabs } from "@/tabs/registry";

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="no-print border-b border-[#d5dee8] bg-white" aria-label="Dashboard sections">
      <div className="mx-auto flex max-w-[1240px] gap-1 overflow-x-auto px-4">
        {tabs.map((tab) => {
          const active = tab.enabled && (tab.href === "/" ? pathname === "/" : pathname === tab.href);
          if (!tab.enabled) {
            return (
              <button
                key={tab.id}
                type="button"
                disabled
                aria-disabled="true"
                title={`${tab.label} is not built yet`}
                className="cursor-not-allowed border-b-2 border-transparent px-3 py-3 text-sm text-[#8aa0b4]"
              >
                {tab.label}
                <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.14em]">Soon</span>
              </button>
            );
          }
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-3 py-3 text-sm font-semibold ${
                active ? "border-navy-900 text-navy-900" : "border-transparent text-[#3e556c] hover:text-navy-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
