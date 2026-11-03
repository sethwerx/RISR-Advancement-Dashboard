export function BrandLogo({ className = "h-10 w-auto" }: { className?: string }) {
  return <img src="/brand/logo.svg" alt="RISR" className={className} />;
}

export function ExportBrandHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-[#e6eef5] pb-2">
      <BrandLogo className="h-7 w-auto" />
      <p className="font-heading text-sm uppercase tracking-[0.14em] text-navy-900">{label}</p>
    </div>
  );
}
