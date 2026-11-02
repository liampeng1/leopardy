import type { Metadata } from "next";
import { Anton, Atkinson_Hyperlegible, Dancing_Script } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { FeedbackBox } from "@/components/FeedbackBox";
import "./globals.css";

// Anton: ultra-bold, ultra-condensed — the closest free match to the board's
// Swiss 911 for categories, dollar values, and titles.
const display = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

// Atkinson Hyperlegible is designed for low-vision readability.
const reading = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-reading",
});

// Dancing Script: a flowing connected cursive for the contestants'
// hand-lettered name strips across the top of each podium. The 700 weight
// keeps the loops legible on the lit blue face.
const hand = Dancing_Script({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-hand",
});

export const metadata: Metadata = {
  title: "Leopardy!",
  description: "Game-master-controlled Leopardy! for the big screen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${reading.variable} ${hand.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FeedbackBox />
        {/* Vercel metrics — the project has Web Analytics + Speed Insights
            enabled, but nothing collects without these. No-ops in dev. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
