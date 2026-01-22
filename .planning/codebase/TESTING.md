# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Status:** Not detected

The codebase does not currently have a configured unit/integration test framework (Jest, Vitest, etc.). No test files found in the source code.

**E2E Testing:**
- Playwright configured for end-to-end testing
- MCP directory: `.playwright-mcp/` with test screenshots
- Production URL: https://fieldops-one.vercel.app
- Test accounts configured (admin@fieldops.com, test@fieldops.com)
- Run commands are managed via Playwright MCP tools

**TypeScript Validation:**
- Config: `tsconfig.json` with strict mode
- Run: `npm run typecheck` executes `tsc --noEmit`
- Catches type errors without emitting files

**Linting:**
- Config: `eslint.config.mjs` (flat config)
- Run: `npm run lint` executes `eslint`
- Uses `eslint-config-next` with core-web-vitals and TypeScript rules

## Test File Organization

**Current State:** No unit/integration test files present

If tests were to be added, expected patterns would be:

**Location Options:**
- Co-located: `components/tasks/task-card.test.tsx` next to `task-card.tsx`
- Separate: `__tests__/components/task-card.test.tsx` in dedicated test directory
- Recommended for this project: Co-located (by convention in Next.js)

**Naming Convention:**
- Unit tests: `{filename}.test.ts` or `{filename}.test.tsx`
- Integration tests: `{filename}.integration.test.ts`

**Structure if using Jest/Vitest:**
```
lib/
  tasks/
    actions.ts
    actions.test.ts
components/
  tasks/
    task-card.tsx
    task-card.test.tsx
__tests__/
  e2e/
    tasks.spec.ts
```

## Manual Testing Approach

**Current Practice:** Manual testing against Vercel deployment

**Test Environment:**
- Production URL: https://fieldops-one.vercel.app
- Test data: Uses real Supabase instance

**Test Accounts:**
```
Admin Account:
  Email: admin@fieldops.com
  Password: admin1234

Field User Account:
  Email: test@fieldops.com
  Password: admin1234
```

**Coverage Areas (from .playwright-mcp screenshots):**
- Login flow (desktop and mobile)
- Task list interface
- Task detail page
- Photo upload and gallery
- Media page with verification

## Code Patterns Requiring Tests

If unit tests were implemented, focus areas:

**Server Actions (lib/*/actions.ts):**
- All database queries and mutations
- Error handling and null cases
- Authorization/permission checks
- Query parameter validation
- Result pagination logic

Example testable action:
```typescript
// lib/tasks/actions.ts - getTasks()
// Should test:
// - Pagination (page=1, pageSize=25)
// - Sorting (sortBy, sortOrder)
// - Filters (statusId, divisionId, etc.)
// - Search (full-text search implementation)
// - Unauthorized user access
```

**Utilities (lib/*/utils):**
- Photo processing: `processPhoto()` with EXIF rotation
- Date formatting: `lib/utils/date.ts`
- Class merging: `cn()` function
- Offline sync helpers

**Client Components:**
- Form submissions and validation
- Offline fallback behavior
- Error state rendering
- Loading states
- Photo upload preview handling

**Offline Sync (lib/offline/):**
- Mutation queue persistence to IndexedDB
- Sync processor conflict resolution
- Background sync API usage
- Online/offline status detection

## Error Handling Testing

**Patterns in Current Code:**

Server action error handling:
```typescript
if (error) {
  console.error('Error fetching divisions:', error);
  return [];  // or null for single queries
}
```

If tests existed, would test:
- Network failures (Supabase query errors)
- Null/missing data scenarios
- Authorization failures
- Invalid input validation

Client component error handling:
```typescript
try {
  const result = await createPhotoRecord(...);
  if (!result.success) {
    setError(result.error);
  }
} catch (error) {
  setError('Failed to upload');
}
```

## Mock & Fixture Patterns

**Supabase Client Mocking:**
If unit tests were to be implemented, would need to mock `@supabase/ssr` client:

```typescript
// Mock pattern (if tests existed)
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockTask }),
    })),
  })),
}));
```

**Test Data/Fixtures:**
Would need to define mock data for:
- Tasks: `TaskWithRelations[]` with relations
- Users: `User[]` with roles
- Statuses: `Status[]` with colors
- Divisions: `Division[]`
- Custom fields: `CustomFieldDefinition[]`
- Comments: `CommentWithUser[]`
- Photos: `PhotoWithUser[]`

**What to Mock:**
- Supabase client methods (queries, mutations)
- Next.js router (navigation, useRouter())
- File API (File, Blob for photo processing)
- Canvas API (for EXIF rotation)
- IndexedDB (for offline storage)

**What NOT to Mock:**
- Business logic in server actions
- Utility functions like `processPhoto()`, `cn()`
- React hooks (use with real React Testing Library)
- TypeScript type checking

## Offline Sync Testing (Proposed)

Complex area that would benefit from tests:

**Mutation Queue (`lib/offline/mutation-queue.ts`):**
- Add mutations to queue
- Mark complete when synced
- Remove on successful sync
- Persist/restore from IndexedDB

**Sync Processor (`lib/offline/sync-processor.ts`):**
- Process queued mutations in order
- Handle conflicts (same field edited offline + online)
- Show conflict resolution UI
- Update local state on success
- Retry failed mutations

**Use-offline-sync Hook (`lib/offline/use-offline-sync.ts`):**
- Load initial data from cache
- Fetch fresh data from server when online
- Auto-sync when coming online
- Manual sync trigger
- Track sync status

**Background Sync (`lib/offline/use-background-sync.ts`):**
- Queue mutations when offline
- Resume processing when online
- Handle Background Sync API (optional)

## Coverage Assessment

**Well-Tested Areas (by convention):**
- Server actions have return type checks
- TypeScript type safety catches many errors
- Supabase RLS ensures database security

**Untested Areas:**
- Photo processing (EXIF orientation, compression, watermarking)
- Offline sync conflict resolution
- File upload validation and handling
- Complex filtering and search in tasks
- Custom field type validation and rendering
- Checklist item operations

**High-Priority Test Additions:**
1. Offline sync mutation queue and processor
2. Photo processing with EXIF rotation
3. Task filtering and pagination logic
4. Custom field value validation
5. Comment and file upload operations
6. Background sync integration

## Development Commands

**Current Setup:**
```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript validation (tsc --noEmit)
```

**No Test Commands Available:**
- No `npm run test` script
- No `npm run test:watch`
- No `npm run test:coverage`

**If Tests Were Added:**
Expected commands would be:
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run e2e              # Run Playwright tests
```

## Type Safety as Testing

**TypeScript Strict Mode Benefits:**

The codebase relies heavily on TypeScript strict mode for error prevention:

**Enabled Checks:**
- No implicit any
- Strict null checks
- Strict function types
- Strict bind call apply

**Type Safety Patterns:**
```typescript
// Database types generated from Supabase schema
import type { Task, Division, Status, User } from '@/lib/database.types';

// Server actions return typed results
export async function getTasks(...): Promise<PaginatedTasksResult>
export async function createTask(data: CreateTaskData): Promise<ActionResult<Task>>

// Component props are typed
interface TaskDetailOfflineWrapperProps {
  taskId: string;
  initialTask: TaskWithRelations;
  statuses: Status[];
  divisions: Division[];
}

// Hooks return typed state
export function useOfflineSync(options: UseOfflineSyncOptions = {}): UseOfflineSyncResult
```

**Verification Method:**
```bash
npm run typecheck  # Validates all types without runtime execution
```

This catches many errors that unit tests would normally find.

---

*Testing analysis: 2026-01-22*
