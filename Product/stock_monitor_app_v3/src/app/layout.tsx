import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Orbitron, Share_Tech_Mono } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "600"],
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto",
  weight: ["400", "700"],
});

const orbitron = Orbitron({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-orbitron",
  weight: ["400", "700", "800"],
});

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-share-tech-mono",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Stock Selection Dashboard",
  description: "日本株の銘柄選定と監視を行うフロントエンドアプリ"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${inter.variable} ${orbitron.variable} ${shareTechMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
