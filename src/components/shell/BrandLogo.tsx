"use client";

import { useState } from "react";

const files = {
  onDark: "/brand/logo-white.png",
  onLight: "/brand/logo-navy.png",
  iconOnDark: "/brand/icon-white.png",
  iconOnLight: "/brand/icon-navy.png",
} as const;

export function BrandLogo({
  variant = "onDark",
  className = "h-16 w-auto",
}: {
  variant?: keyof typeof files;
  className?: string;
}) {
  const [src, setSrc] = useState<string>(files[variant]);
  return (
    <img
      src={src}
      alt="RISR"
      className={className}
      onError={() => setSrc("/brand/logo.svg")}
    />
  );
}

export function ExportBrandHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 flex items-center gap-3 border-b border-[#e6eef5] pb-2">
      <BrandLogo variant="onLight" className="h-16 w-auto" />
      <p className="font-heading text-sm uppercase tracking-[0.14em] text-navy-900">{label}</p>
    </div>
  );
}
