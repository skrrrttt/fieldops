/**
 * Exponential backoff with bounded jitter for rate limit handling
 * Based on AWS Architecture Blog recommendations
 */

/**
 * Calculate exponential backoff delay with bounded jitter (+/- 25%)
 */
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000,
  jitterFactor: number = 0.25
): number {
  // Exponential: base * 2^attempt, capped at maxDelay
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));

  // Bounded jitter: exponential * (1 +/- jitterFactor)
  const jitterRange = exponential * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // -25% to +25%

  return Math.floor(exponential + jitter);
}

/**
 * Detect rate limit errors from various error formats
 * Handles Supabase Auth errors, generic HTTP 429, and message patterns
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const e = error as Record<string, unknown>;

  // Check HTTP status code
  if (e.status === 429) return true;

  // Check Supabase error codes
  if (e.code === 'over_request_rate_limit') return true;
  if (e.code === 'rate_limit_exceeded') return true;

  // Check message patterns as fallback
  const message = typeof e.message === 'string' ? e.message.toLowerCase() : '';
  return message.includes('rate limit') || message.includes('too many requests') || message.includes('429');
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
