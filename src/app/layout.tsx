import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { LenisProvider } from "@/lib/lenis";
import "./globals.css";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Yazmin — a small gallery",
  description: "A short, warm, scroll-driven gallery.",
};

export const viewport: Viewport = {
  themeColor: "#EDE4DA",
  // draw under the notch / home bar; the edges are padded with safe-area insets
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} is-loading`}>
      <body>
        <LenisProvider>{children}</LenisProvider>
        <div className="grain" aria-hidden />
      </body>
    </html>
  );
}
