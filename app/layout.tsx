import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { PWAInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PWASplashScreen } from "@/components/pwa/pwa-splash-screen";
import { BrandingProviderWrapper } from "@/components/providers/branding-provider-wrapper";
import { getBranding } from "@/lib/branding/actions";

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

// Note: metadata.title and appleWebApp.title are set to defaults here
// but the dynamic manifest at /manifest.json uses branding settings
export const metadata: Metadata = {
  title: "Flux",
  description: "Flux - Offline-first task management for field service crews",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Flux",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch branding server-side for initial render
  const branding = await getBranding();

  return (
    <html lang="en">
      <head>
        {/* Apple touch icon is auto-generated from app/apple-icon.tsx */}
        {/* Dynamic theme color from branding */}
        {branding?.primary_color && (
          <meta name="theme-color" content={branding.primary_color} />
        )}
      </head>
      <body
        className={`${sora.variable} ${dmSans.variable} ${dmMono.variable} antialiased`}
      >
        <BrandingProviderWrapper initialBranding={branding}>
          <ServiceWorkerRegistration />
          <PWASplashScreen />
          <PWAInstallPrompt />
          {children}
        </BrandingProviderWrapper>
      </body>
    </html>
  );
}
