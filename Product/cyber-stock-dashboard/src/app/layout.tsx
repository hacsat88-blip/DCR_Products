import type { Metadata } from "next";
import {
  DM_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Noto_Sans_JP,
  Shippori_Mincho,
} from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/ember/theme/ThemeProvider";
import { themeInitScript } from "@/components/ember/theme/theme-init-script";
import { AppHeader } from "@/components/ember/layout/AppHeader";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const notoJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-jp",
  display: "swap",
});
const shippori = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-shippori",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ember Stock Atelier",
  description: "Warm, editorial-grade stock research atelier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontVars = [
    dmSans.variable,
    instrumentSerif.variable,
    jetbrainsMono.variable,
    notoJp.variable,
    shippori.variable,
  ].join(" ");

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${fontVars} bg-bg text-ink antialiased`}>
        <ThemeProvider>
          <Providers>
            <AppHeader />
            {children}
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
