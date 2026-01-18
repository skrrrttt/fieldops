import { NextResponse } from 'next/server';

/**
 * GET /manifest.json
 * Static PWA manifest for ProStreet
 */
export async function GET() {
  const manifest = {
    name: 'ProStreet',
    short_name: 'ProStreet',
    description: 'ProStreet - Offline-first task management for field service crews',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#f97316',
    orientation: 'any',
    icons: [
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    categories: ['business', 'productivity'],
    scope: '/',
    lang: 'en',
    prefer_related_applications: false,
    related_applications: [],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
