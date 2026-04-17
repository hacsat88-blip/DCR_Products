import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";

import "./globals.css";
import "@/styles/tokens.css";
import { AppCommandPaletteMount } from "@/components/ui/AppCommandPaletteMount";
import { AiExplainProvider } from "@/components/ui/AiExplainDrawer";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Investment Navigator Pro",
  description: "日本株の銘柄選定と監視を行うフロントエンドアプリ",
  manifest: "/manifest.json",
  applicationName: "Investment Navigator Pro",
  appleWebApp: {
    capable: true,
    title: "Navigator",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#00D9FF",
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${inter.variable}`}>
      <body>
        <AiExplainProvider>
          {children}
          <AppCommandPaletteMount />
          <ServiceWorkerRegister />
        </AiExplainProvider>
      </body>
    </html>
  );
}
