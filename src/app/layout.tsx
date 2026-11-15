import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { URL_SITUS } from "@/lib/situs";
import "./globals.css";

const fontMono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-jetbrains" });

const DESKRIPSI =
  "Who's knocking on Indonesia's digital door? Peta threat intel: asal serangan ke Indonesia, host jahat di jaringan Indonesia, tren, dan kampanye. Semua dari feed publik.";

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITUS),
  title: "Cyber Attack Map ID — siapa yang ngetuk pintu digital Indonesia",
  description: DESKRIPSI,
  keywords: ["Indonesia", "cyber attack map", "threat intelligence", "peta serangan siber", "DDoS", "malware", "Cloudflare Radar", "URLhaus", "BSSN"],
  authors: [{ name: "Avalon2222", url: "https://github.com/Avalon2222" }],
  openGraph: { title: "Cyber Attack Map ID", description: DESKRIPSI, url: URL_SITUS, siteName: "Cyber Attack Map ID", type: "website", locale: "id_ID" },
  twitter: { card: "summary_large_image", title: "Cyber Attack Map ID", description: "Who's knocking on Indonesia's digital door?" },
};

export const viewport: Viewport = {
  themeColor: "#02050b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`h-full ${fontMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://tiles.openfreemap.org" />
      </head>
      <body className="h-full">
        {children}
        {/* Vercel Web Analytics: tanpa cookie, cuma dipasang di build Vercel */}
        {process.env.VERCEL ? <Analytics /> : null}
      </body>
    </html>
  );
}
