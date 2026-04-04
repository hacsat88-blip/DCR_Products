import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";

import "./globals.css";

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
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Stock Selection Dashboard",
  description: "日本株の銘柄選定と監視を行うフロントエンドアプリ"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
