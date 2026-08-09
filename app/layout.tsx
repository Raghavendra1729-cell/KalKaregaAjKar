import type { Metadata, Viewport } from "next";
import { DM_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kal Karega, Aaj Kar", template: "%s · Kal Karega" },
  description: "Daily Study tasks and a simple seven-day Gym plan.",
  applicationName: "Kal Karega",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Kal Karega" },
};

export const viewport: Viewport = { themeColor: "#F7F4EE", colorScheme: "light", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${manrope.variable} ${dmMono.variable}`}><body>{children}</body></html>;
}
