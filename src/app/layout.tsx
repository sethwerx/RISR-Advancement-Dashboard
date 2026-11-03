import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import "@fontsource/bebas-neue/latin-400.css";
import "@fontsource/oswald/latin-400.css";
import "@fontsource/oswald/latin-500.css";
import "@fontsource/oswald/latin-600.css";
import "@fontsource/carlito/latin-400.css";
import "@fontsource/carlito/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "RISR Advancement Office",
  description: "Admissions and advancement dashboard for Ruamrudee International School Ratchapruek.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
