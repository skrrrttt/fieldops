import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PWASplashScreen } from "@/components/pwa/pwa-splash-screen";
import { ThemeProviderWrapper } from "@/components/providers/branding-provider-wrapper";

// Display & Heading font - geometric, modern, tech-forward
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Body font - clean, readable, professional
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Mono font - for code and data
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "ProStreet",
  description: "ProStreet - Offline-first task management for field service crews",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ProStreet",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${sora.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        <ThemeProviderWrapper>
          <ServiceWorkerRegistration />
          <PWASplashScreen />
          <PWAInstallPrompt />
          {children}
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}
