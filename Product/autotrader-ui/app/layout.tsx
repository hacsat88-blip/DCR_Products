import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AutoTrader Dashboard",
  description: "AutoTrader の監視中心 Next.js ダッシュボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
