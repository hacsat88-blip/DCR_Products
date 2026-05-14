import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autotrader — 東証プライム短期売買",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-[#0B0F17] text-white antialiased">{children}</body>
    </html>
  );
}
