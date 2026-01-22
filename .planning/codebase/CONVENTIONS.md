# Coding Conventions

**Analysis Date:** 2026-01-22

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `PhotoGallery.tsx`, `TaskCard.tsx`)
- Actions: kebab-case with `.ts` extension (e.g., `tasks/actions.ts`, `divisions/actions.ts`)
- Utilities: kebab-case (e.g., `process-photo.ts`, `use-offline-sync.ts`)
- Hooks: camelCase with `use` prefix (e.g., `useOfflineSync`, `useTaskOffline`)
- Types/Interfaces: PascalCase exported from files (e.g., `TaskWithRelations`, `ActionResult`)

**Functions:**
- Server actions: camelCase (e.g., `getTasks()`, `createTask()`, `updateTaskStatus()`)
- Custom hooks: camelCase with `use` prefix (e.g., `useOfflineSync()`, `useOnlineStatus()`)
- Component functions: PascalCase (e.g., `PhotoGallery()`, `TaskCard()`)
- Utility functions: camelCase (e.g., `cn()`, `processPhoto()`, `getExifOrientation()`)

**Variables:**
- Constants: UPPER_SNAKE_CASE for true constants (e.g., `DEFAULT_MAX_SIZE = 1920`, `DEFAULT_QUALITY = 0.8`)
- React state: camelCase (e.g., `photosWithUrls`, `lightboxIndex`, `isLoading`)
- Type/interface names: PascalCase (e.g., `PhotoWithUrl`, `OfflineSyncState`)
- Database records: snake_case from database, converted to camelCase in TypeScript (e.g., `display_name` in DB → `displayName` in code)

**Types:**
- Interfaces: PascalCase with no prefix (e.g., `ActionResult<T>`, `TaskWithRelations`)
- Async function return types: Wrapped in `Promise<T>` (e.g., `Promise<TaskWithRelations>`)
- Generic types: Single uppercase letter or descriptive (e.g., `T`, `ActionResult<T = void>`)
- Data interfaces: Often end with `WithUser`, `WithRelations` for joined data

## Code Style

**Formatting:**
- No explicit formatter in package.json (Prettier not configured)
- ESLint used for linting via `npm run lint`
- Code follows Next.js/React conventions with consistent spacing
- Single quotes for strings in imports/exports: `import { createClient } from '@/lib/...'`
- Double quotes for component attributes: `className="..."`
- Trailing commas in multiline objects/arrays

**Linting:**
- ESLint with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs` (flat config format)
- TypeScript strict mode enabled: `"strict": true` in tsconfig.json

**Key eslint Settings:**
```javascript
// eslint.config.mjs uses:
// - nextVitals (Core Web Vitals rules)
// - nextTs (TypeScript rules)
// - Ignores: .next/, out/, build/, next-env.d.ts
```

## Import Organization

**Order:**
1. React and third-party imports: `import React`, `import { useState }` from `'react'`
2. Next.js imports: `import { useRouter }` from `'next/navigation'`, `import Image from 'next/image'`
3. Third-party libraries: `import { createClient } from '@supabase/ssr'`, `import type { ClassValue }`
4. Absolute imports using `@/`: `import { createClient } from '@/lib/supabase/server'`
5. Type imports separated: `import type { Task, Division }` from `'@/lib/database.types'`

**Path Aliases:**
- Base alias: `@/*` points to project root (configured in `tsconfig.json`)
- Pattern: `@/lib/...` for utilities/actions, `@/components/...` for React components
- Example: `import { cn } from '@/lib/utils'`, `import { Button } from '@/components/ui/button'`

**'use client' directive:**
- Required in all client components (interactive UI, hooks, event handlers)
- Placed at top of file before imports (e.g., `'use client';`)
- Server actions marked with `'use server';` directive

**'use server' directive:**
- Required for server actions in `lib/*/actions.ts` files
- Enables database access and Supabase client creation
- Example: `// lib/tasks/actions.ts starts with 'use server'`

## Error Handling

**Patterns:**
- Try-catch blocks used in offline sync and photo processing (e.g., `lib/offline/sync-processor.ts`)
- Console.error for logging: `console.error('Error fetching tasks:', error)`
- Returned null values on error: `if (error) { console.error(...); return null; }`
- `ActionResult<T>` interface for server action responses:
```typescript
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
```

**Error Strategy:**
- Server actions return `ActionResult` with success flag and optional error message
- Client components use try-catch for async operations, set error state
- Offline operations queue mutations and show sync status via toast/indicator
- Failed operations preserve state and allow retry

**Error Messages:**
- Prefixed with context: `'Error creating comment:'`, `'Error fetching divisions:'`
- Passed to client via `error` property in `ActionResult`

## Logging

**Framework:** `console` (no dedicated logging library)

**Patterns:**
- Errors logged with `console.error()` in action functions after Supabase errors
- Pattern: `console.error('Context message:', error)`
- Used in: `getTasks()`, `getDivisions()`, `createTask()`, etc.
- Offline sync failures logged via console in `lib/offline/sync-processor.ts`

**When to Log:**
- Database query failures
- Supabase client errors
- Sync processor failures
- EXIF processing errors in photo handling

## Comments

**When to Comment:**
- JSDoc blocks for exported functions explaining purpose and behavior
- Inline comments for complex logic (e.g., EXIF parsing, sync conflict resolution)
- Section comments with dividers: `// ============ Customer Actions ============`
- Implementation notes: `// Check if user owns this comment or is admin`

**JSDoc/TSDoc:**
- Used for exported public functions
- Format: `/** * description */`
- Example:
```typescript
/**
 * Get paginated tasks with filters, sorting, and search
 */
export async function getTasks(
  params: TasksQueryParams = {}
): Promise<PaginatedTasksResult> { ... }
```

- Optional parameter descriptions in complex functions
- Return type specified in function signature, not JSDoc

## Function Design

**Size:**
- Server actions: 20-100 lines (many have 50-80 lines)
- Utility functions: <50 lines preferred
- Custom hooks: 30-100 lines depending on complexity
- Complex functions have clear section comments

**Parameters:**
- Destructured from objects when multiple parameters: `function getTasks(params: TasksQueryParams = {})`
- Optional params have defaults: `pageSize = 25`, `sortOrder = 'desc'`
- Type-safe with interfaces: `CreateTaskData`, `UpdateTaskData` interfaces define params

**Return Values:**
- Server actions: `Promise<ActionResult<T>>` or `Promise<T>`
- Queries: `Promise<T[]>` or `Promise<T | null>`
- Hooks: Return object with state and methods: `{ state, tasks, syncNow }`
- Null on errors (rather than throwing)

## Module Design

**Exports:**
- Server actions export async functions and supporting interfaces
- Components export named functions (not default): `export function PhotoGallery(...)`
- UI components export component and variants: `export { Button, buttonVariants }`
- Utilities export single function or multiple utilities

**Barrel Files:**
- `lib/offline/index.ts` exports all offline utilities: functions, types, hooks
- `lib/*/actions.ts` files export all actions for a domain
- No barrel files in `components/` - direct imports required

**Pattern: Components with Wrappers:**
- Offline components have "wrapper" pattern:
  - `TaskListOfflineWrapper` manages sync, wraps `TaskList`
  - `TaskDetailOfflineWrapper` manages task sync, wraps `TaskDetail`
  - Separation: wrapper handles data sync, child component handles UI

**Pattern: Server Actions Module:**
- Each domain has `lib/{domain}/actions.ts` with:
  - `ActionResult<T>` interface (if not imported from shared)
  - Interface definitions for inputs/query params
  - Exported async functions
  - Example: `lib/tasks/actions.ts` has 400+ lines of 10+ exported functions

## Type Safety

**TypeScript Configuration:**
- Strict mode enabled: catches null/undefined errors
- No implicit any: `"noEmit": true` allows type checking without transpilation
- Isolated modules: each file can be independently transpiled
- Module resolution: `"bundler"` mode for modern bundler compatibility

**Type Usage:**
- Interfaces preferred for object shapes (not type aliases)
- Generic ActionResult<T> for server action responses
- Database types imported from `@/lib/database.types` (generated from Supabase)
- Optional chaining used: `user?.email || ''`

---

*Convention analysis: 2026-01-22*
