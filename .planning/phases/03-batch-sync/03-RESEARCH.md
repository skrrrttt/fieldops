# Phase 3: Batch Sync - Research

**Researched:** 2026-01-23
**Domain:** JavaScript async concurrency, exponential backoff, rate limit handling
**Confidence:** HIGH

## Summary

This research covers the implementation of batch mutation processing for the offline sync system. The current sync processor processes mutations sequentially (one-by-one), which is inefficient. The goal is to process mutations in parallel batches with configurable concurrency, while properly handling rate limit errors (429) with exponential backoff and jitter.

The standard approach uses `Promise.allSettled()` for batch processing (allows independent failure handling), `p-limit` for concurrency control, and "full jitter" exponential backoff for rate limit resilience. The existing codebase already has the mutation type separation needed to apply different concurrency limits to data mutations vs photo uploads.

**Primary recommendation:** Use `p-limit` v7.x with `Promise.allSettled()` for batch processing, implement full jitter exponential backoff for 429 handling, and separate data/photo queues with different concurrency limits (5 for data, 2 for photos).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| p-limit | ^7.2.0 | Concurrency control for async operations | 35.6M+ dependents, battle-tested, TypeScript support, ESM compatible |
| Promise.allSettled | Native | Process batch with independent failure handling | Built-in, returns all results regardless of individual failures |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (native setTimeout) | N/A | Delay for backoff | Always available, no dependency needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| p-limit | p-queue | p-queue has more features (pause, introspection) but more complex; p-limit is simpler and sufficient |
| p-limit | Hand-rolled iterator | Works for simple cases but p-limit handles edge cases better |
| Promise.allSettled | Promise.all | Promise.all rejects on first failure, not suitable for independent batch processing |

**Installation:**
```bash
npm install p-limit
```

## Architecture Patterns

### Recommended Batch Processing Structure
```
lib/offline/
├── sync-processor.ts       # Main sync orchestration (refactored)
├── batch-processor.ts      # NEW: Batch processing with concurrency control
├── backoff.ts             # NEW: Exponential backoff with jitter utilities
├── mutation-queue.ts      # Existing (no changes needed)
└── db.ts                  # Existing (no changes needed)
```

### Pattern 1: Batch Processing with p-limit
**What:** Wrap each mutation processor in a concurrency limiter, process batches with `Promise.allSettled`
**When to use:** Processing multiple independent async operations with controlled concurrency
**Example:**
```typescript
// Source: p-limit README + Promise.allSettled MDN
import pLimit from 'p-limit';

const dataLimit = pLimit(5);   // 5 concurrent data mutations
const photoLimit = pLimit(2);  // 2 concurrent photo uploads

async function processBatch(mutations: TypedPendingMutation[]): Promise<SyncResult[]> {
  const tasks = mutations.map(mutation => {
    const limit = mutation.type === 'photo' || mutation.type === 'file'
      ? photoLimit
      : dataLimit;

    return limit(() => processMutation(mutation));
  });

  const results = await Promise.allSettled(tasks);

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      success: false,
      mutationId: mutations[index].id,
      error: result.reason?.message || 'Unknown error'
    };
  });
}
```

### Pattern 2: Full Jitter Exponential Backoff
**What:** Randomized exponential delay to prevent thundering herd
**When to use:** After receiving 429 rate limit errors
**Example:**
```typescript
// Source: AWS Architecture Blog - Exponential Backoff and Jitter
function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): number {
  // Exponential: base * 2^attempt
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));

  // Full jitter: random between 0 and exponential
  const jitter = Math.random() * exponential;

  return Math.floor(jitter);
}

// With +/- 25% jitter variant (as specified in CONTEXT.md)
function calculateBackoffWithBoundedJitter(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 60000,
  jitterFactor: number = 0.25
): number {
  const exponential = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));

  // Bounded jitter: exponential * (1 +/- jitterFactor)
  const jitterRange = exponential * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // -25% to +25%

  return Math.floor(exponential + jitter);
}
```

### Pattern 3: Rate Limit Detection and Handling
**What:** Detect 429 errors, pause sync, apply backoff, resume
**When to use:** When Supabase or any API returns 429 status
**Example:**
```typescript
// Source: Supabase docs + MDN 429 handling
function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    // Supabase Auth errors
    if ('status' in error && error.status === 429) return true;
    if ('code' in error && error.code === 'over_request_rate_limit') return true;

    // Generic fetch errors
    if ('message' in error && typeof error.message === 'string') {
      return error.message.includes('429') ||
             error.message.toLowerCase().includes('rate limit');
    }
  }
  return false;
}

async function syncWithRateLimitHandling(): Promise<SyncProgress> {
  let rateLimitRetries = 0;
  const maxRateLimitRetries = 5;

  while (rateLimitRetries < maxRateLimitRetries) {
    try {
      return await processAllMutationsBatched();
    } catch (error) {
      if (isRateLimitError(error)) {
        rateLimitRetries++;
        const delay = calculateBackoffWithBoundedJitter(rateLimitRetries);
        console.log(`Rate limited. Retry ${rateLimitRetries}/${maxRateLimitRetries} after ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max rate limit retries exceeded');
}
```

### Pattern 4: Separate Queues by Mutation Type
**What:** Process data mutations and file uploads with different concurrency
**When to use:** When different operation types have different resource requirements
**Example:**
```typescript
// Source: Project CONTEXT.md decisions
async function processAllMutationsBatched(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncProgress> {
  const mutations = await getPendingMutations();

  // Separate by type
  const dataMutations = mutations.filter(m => m.type === 'status' || m.type === 'comment');
  const fileMutations = mutations.filter(m => m.type === 'photo' || m.type === 'file');

  // Process data mutations first (faster, smaller payloads)
  const dataResults = await processBatchWithLimit(dataMutations, 5);

  // Then file mutations (slower, larger payloads, stricter rate limits)
  const fileResults = await processBatchWithLimit(fileMutations, 2);

  return combineResults(dataResults, fileResults);
}
```

### Anti-Patterns to Avoid
- **Promise.all for batch processing:** Rejects immediately on first failure, losing other results
- **Fixed delay retry:** Creates synchronized retry waves (thundering herd)
- **Unbounded concurrency:** `mutations.map(m => processMutation(m))` can overwhelm the server
- **Shared retry counter across mutation types:** Photo failures shouldn't penalize data mutations

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency limiting | Custom queue with counter | `p-limit` | Edge cases around promise rejection, cleanup, memory leaks |
| Batch result aggregation | Manual try/catch per item | `Promise.allSettled` | Native, handles edge cases, cleaner code |
| Random number generation | `Math.random()` alone | `Math.random()` with proper range | Range calculation errors are common |

**Key insight:** The batch processing pattern itself is simple enough to implement without a heavy framework, but `p-limit` provides battle-tested concurrency control that handles edge cases around promise rejection and cleanup.

## Common Pitfalls

### Pitfall 1: Mutation Order Dependencies
**What goes wrong:** Batching mutations that depend on each other (e.g., create then update same record)
**Why it happens:** Assuming all mutations are independent
**How to avoid:** Process mutations for the same entity sequentially; batch only across different entities
**Warning signs:** Test failures with "record not found" when processing updates

### Pitfall 2: Thundering Herd After Backoff
**What goes wrong:** All clients retry at the same time after a rate limit pause
**Why it happens:** Using fixed backoff delays without jitter
**How to avoid:** Always add jitter (randomness) to backoff delays
**Warning signs:** Rate limit errors immediately after retry attempts

### Pitfall 3: Losing Mutation Status on Batch Failure
**What goes wrong:** If batch processing crashes, mutations marked as "syncing" are orphaned
**Why it happens:** Marking status before processing, not handling crashes
**How to avoid:** Use try/finally to reset failed mutations to "pending"; or mark "syncing" only after successful processing
**Warning signs:** Mutations stuck in "syncing" status after app crash

### Pitfall 4: Incorrect Promise.allSettled Result Handling
**What goes wrong:** Treating rejected results as if they have a `value` property
**Why it happens:** Not checking `result.status` before accessing properties
**How to avoid:** Always check `status === 'fulfilled'` before accessing `value`, `status === 'rejected'` before accessing `reason`
**Warning signs:** TypeError accessing undefined properties

### Pitfall 5: Not Detecting Rate Limits in Supabase Errors
**What goes wrong:** Supabase wraps 429 in custom error objects, string matching fails
**Why it happens:** Assuming error.status or error.message format
**How to avoid:** Check multiple error properties: `status`, `code`, and message patterns
**Warning signs:** Rate limits not triggering backoff, sync fails repeatedly

### Pitfall 6: Blocking UI During Backoff
**What goes wrong:** Long backoff delays freeze the sync progress
**Why it happens:** Not updating UI during wait periods
**How to avoid:** Continue to call `onProgress` with a "rate_limited" or "waiting" status during backoff
**Warning signs:** User sees sync stuck with no feedback

## Code Examples

Verified patterns from official sources:

### Promise.allSettled Result Processing
```typescript
// Source: MDN Promise.allSettled documentation
const results = await Promise.allSettled(promises);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Promise ${index} fulfilled with:`, result.value);
  } else {
    console.log(`Promise ${index} rejected with:`, result.reason);
  }
});

// Filter successful/failed
const fulfilled = results.filter(r => r.status === 'fulfilled');
const rejected = results.filter(r => r.status === 'rejected');
```

### p-limit Usage with TypeScript
```typescript
// Source: p-limit GitHub README
import pLimit from 'p-limit';

const limit = pLimit(5);

// Type-safe: limit preserves the return type of the wrapped function
const results = await Promise.all([
  limit(() => fetchData('a')),  // Promise<DataType>
  limit(() => fetchData('b')),
  limit(() => fetchData('c')),
]);

// Check current state
console.log(limit.activeCount);   // Currently running
console.log(limit.pendingCount);  // Waiting in queue
```

### Exponential Backoff with Full Jitter (AWS Pattern)
```typescript
// Source: AWS Architecture Blog
function fullJitterBackoff(attempt: number, base: number, cap: number): number {
  const exponential = Math.min(cap, base * Math.pow(2, attempt));
  return Math.floor(Math.random() * exponential);
}

// Usage
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
  maxDelay: number = 60000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = fullJitterBackoff(attempt, baseDelay, maxDelay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Unreachable');
}
```

### Supabase Error Detection
```typescript
// Source: Supabase error codes documentation
interface SupabaseError {
  status?: number;
  code?: string;
  message?: string;
  __isAuthError?: boolean;
}

function isRateLimitError(error: unknown): boolean {
  const e = error as SupabaseError;

  // Check status code
  if (e?.status === 429) return true;

  // Check error codes
  if (e?.code === 'over_request_rate_limit') return true;
  if (e?.code === 'rate_limit_exceeded') return true;

  // Check message as fallback
  const msg = e?.message?.toLowerCase() || '';
  return msg.includes('rate limit') || msg.includes('too many requests');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sequential processing | Batched with concurrency limits | Standard practice | 3-5x faster sync times |
| Fixed retry delays | Exponential backoff with jitter | AWS 2015+ recommendation | Prevents thundering herd, better recovery |
| Promise.all for batches | Promise.allSettled | ES2020+ | Individual failure isolation |
| Manual concurrency tracking | p-limit library | Well-established | Simpler, more reliable code |

**Deprecated/outdated:**
- Using `Promise.all` for batch processing when individual failures should be isolated
- Fixed retry intervals (e.g., always wait 5 seconds)
- Equal jitter backoff (full jitter performs better per AWS research)

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Storage Rate Limits**
   - What we know: Auth endpoints have documented rate limits; storage rate limits exist but are less documented
   - What's unclear: Exact rate limits for photo/file uploads per project tier
   - Recommendation: Start with conservative concurrency (2 for files) and monitor; adjust if 429s occur

2. **Retry-After Header from Supabase**
   - What we know: HTTP spec defines Retry-After for 429 responses; Supabase may or may not send it
   - What's unclear: Whether Supabase consistently includes Retry-After header
   - Recommendation: Check for header and use if present; fall back to exponential backoff otherwise

## Sources

### Primary (HIGH confidence)
- [MDN Promise.allSettled](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled) - Return value format, usage patterns
- [p-limit GitHub](https://github.com/sindresorhus/p-limit) - API, version 7.2.0, TypeScript support
- [AWS Architecture Blog - Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) - Full jitter formula, comparison of jitter strategies
- [Supabase Rate Limits Documentation](https://supabase.com/docs/guides/auth/rate-limits) - Auth rate limiting behavior

### Secondary (MEDIUM confidence)
- [Supabase Error Codes](https://supabase.com/docs/guides/auth/debugging/error-codes) - Error code patterns for detection
- [MDN 429 Too Many Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429) - Standard 429 handling, Retry-After header
- [AWS Builders Library - Timeouts, retries and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) - Production patterns at scale

### Tertiary (LOW confidence)
- Various blog posts on batch processing patterns (verified against official docs above)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - p-limit and Promise.allSettled are well-documented, widely used
- Architecture: HIGH - Patterns verified from official AWS and MDN documentation
- Pitfalls: HIGH - Based on documented error handling + common JavaScript async issues

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, no breaking changes expected)
