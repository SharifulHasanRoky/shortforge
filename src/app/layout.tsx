import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShortForge - Faceless YouTube Shorts Automation",
  description: "Drop a hint. Get a ready-to-post USA motivational YouTube Short with AI script, voiceover, images, and Hormozi-style captions. Auto-scheduled + auto-posted.",
  keywords: ["YouTube Shorts", "faceless shorts", "AI shorts maker", "motivational content", "automation"],
  authors: [{ name: "ShortForge" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ShortForge - Faceless YouTube Shorts Automation",
    description: "Drop a hint. Get a ready-to-post USA motivational YouTube Short.",
    siteName: "ShortForge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShortForge",
    description: "Faceless YouTube Shorts Automation",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
