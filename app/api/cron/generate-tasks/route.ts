import { NextRequest, NextResponse } from 'next/server';
import { processRecurringTemplates } from '@/lib/templates/recurring';

// Vercel Cron configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/cron/generate-tasks
 *
 * Called by Vercel Cron to generate tasks from recurring templates.
 * Runs every 15 minutes by default (configured in vercel.json).
 *
 * Security: Validates CRON_SECRET header to prevent unauthorized access.
 */
export async function POST(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In production, require CRON_SECRET
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  try {
    const results = await processRecurringTemplates();

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[Cron] Generated ${successful} tasks, ${failed} failures`);

    return NextResponse.json({
      success: true,
      generated: successful,
      failed,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error processing recurring templates:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/generate-tasks
 *
 * Health check endpoint - returns status without generating tasks.
 * Useful for monitoring and debugging.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'generate-tasks',
    description: 'Processes recurring templates and generates tasks',
    method: 'POST to trigger generation',
  });
}
