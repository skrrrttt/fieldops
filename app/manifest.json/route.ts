import { NextResponse } from 'next/server';
import { getBranding } from '@/lib/branding/actions';

/**
 * GET /manifest.json
 * Dynamically generated PWA manifest with branding settings
 * Includes splash screen configuration via icons and theme colors
 */
export async function GET() {
  const branding = await getBranding();

  const appName = branding?.app_name || 'Flux';
  const themeColor = branding?.primary_color || '#0066cc';
  // Use theme color for splash screen background for consistent branding
  const backgroundColor = themeColor;

  // Build icons array - use branding logo if available for splash screen
  const icons = [
    {
      src: '/api/icons/192',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable',
    },
    {
      src: '/api/icons/512',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ];

  // If branding has a logo, add it as an icon option (browser may use for splash)
  if (branding?.logo_url) {
    icons.push({
      src: branding.logo_url,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    });
  }

  const manifest = {
    name: appName,
    short_name: appName,
    description: 'Flux - Offline-first task management for field service crews',
    start_url: '/',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    orientation: 'any',
    icons,
    categories: ['business', 'productivity'],
    scope: '/',
    lang: 'en',
    // Additional fields for better PWA support
    prefer_related_applications: false,
    related_applications: [],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      // Cache for 1 hour to allow branding updates to propagate
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
