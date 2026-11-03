import type { Metadata } from "next";
import { Bebas_Neue, Carlito, Oswald } from "next/font/google";
import { AppShell } from "@/components/shell/AppShell";
import "./globals.css";

const title = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-title",
});

const heading = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
});

const carlito = Carlito({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-carlito",
});

export const metadata: Metadata = {
  title: "RISR Advancement",
  description: "Admissions and advancement dashboard for Ruamrudee International School Ratchapruek.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${title.variable} ${heading.variable} ${carlito.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
