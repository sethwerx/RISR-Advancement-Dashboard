import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/shell/ComingSoon";
import { tabs } from "@/tabs/registry";

export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const href = slug.length === 0 ? "/" : `/${slug[0]}`;
  const tab = tabs.find((item) => item.href === href);
  if (!tab) notFound();
  if (!tab.enabled || !tab.Component) return <ComingSoon tab={tab} />;
  const Active = tab.Component;
  return <Active />;
}
