import { ComingSoon } from "@/components/shell/ComingSoon";

export default function NotFound() {
  return (
    <ComingSoon
      tab={{
        id: "missing",
        label: "Page not found",
        href: "/",
        enabled: false,
        description: "That address is not part of the advancement dashboard.",
      }}
    />
  );
}
