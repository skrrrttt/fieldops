import { NextResponse } from 'next/server';
import { getBranding } from '@/lib/branding/actions';

/**
 * GET /api/branding
 * Returns current branding settings for client-side use
 */
export async function GET() {
  const branding = await getBranding();

  return NextResponse.json({
    branding,
  });
}
