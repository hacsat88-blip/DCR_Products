import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Cyber Stock Dashboard",
  description: "Cyberpunk-themed stock research dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-[#050B1A] text-[#F4FAFF] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
