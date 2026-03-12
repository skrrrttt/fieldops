# PRD: Interactive Calendar View

## Introduction

Add a full-featured calendar to FieldOps for visualizing and managing task schedules. Tasks with `start_date` and `end_date` render as multi-day bars (Gantt-lite style). Admins can create and drag-drop tasks directly on the calendar; field users get a read-only view of their assignments. A mini-calendar widget on the admin dashboard provides at-a-glance scheduling context.

## Goals

- Visualize all scheduled tasks on month, week, and day views
- Let admins create tasks by clicking a date and reschedule by dragging
- Auto-populate from existing tasks with `start_date`/`end_date`
- Color-code events by division for instant recognition
- Provide a mini-calendar dashboard widget showing upcoming task density
- Support configurable visibility scope (own tasks, division, or all)

## User Stories

### US-001: Calendar page route and navigation
**Description:** As a user, I want a dedicated calendar page accessible from the sidebar so I can view my schedule.

**Acceptance Criteria:**
- [ ] Admin route at `/admin/calendar` with sidebar entry (between Tasks and Customers)
- [ ] Field user route at `/calendar` with bottom nav entry
- [ ] Page renders a calendar defaulting to month view
- [ ] Page title is "Calendar"
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-002: Month view with multi-day task bars
**Description:** As a user, I want to see tasks spanning across days as horizontal bars so I can understand task duration at a glance.

**Acceptance Criteria:**
- [ ] Month grid shows current month with day cells
- [ ] Tasks with both `start_date` and `end_date` render as colored bars spanning the date range
- [ ] Tasks with only `start_date` render as a single-day chip on that date
- [ ] Tasks with no dates do not appear on the calendar
- [ ] Bar color matches the task's division color (fallback to primary if no division)
- [ ] Bar shows task title text, truncated if needed
- [ ] Status indicator dot (using status color) on each bar
- [ ] Completed tasks render with reduced opacity (0.5) and a subtle strikethrough or muted style
- [ ] Toggle to show/hide completed tasks (default: shown)
- [ ] Clicking a task bar opens the existing task detail/edit modal
- [ ] Today's date cell is visually highlighted
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-003: Week view
**Description:** As a user, I want a week view for more detailed daily scheduling.

**Acceptance Criteria:**
- [ ] 7-column grid showing one week (Mon-Sun or Sun-Sat based on locale)
- [ ] Day columns show time slots or all-day task bars at the top
- [ ] Multi-day tasks render as spanning bars across day columns
- [ ] Same click-to-view behavior as month view
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-004: Day view
**Description:** As a user, I want a day view to see all tasks for a specific date in detail.

**Acceptance Criteria:**
- [ ] Single-day view listing all tasks that overlap that date
- [ ] Each task shows: title, division badge, status badge, assigned user, time range
- [ ] Tasks ordered by start_date, then title
- [ ] Click task to open detail/edit modal
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-005: View switcher and date navigation
**Description:** As a user, I want to switch between month/week/day views and navigate forward/backward.

**Acceptance Criteria:**
- [ ] Segmented control (Month | Week | Day) in the calendar header
- [ ] Previous/Next buttons to navigate by the active view's unit
- [ ] "Today" button to jump back to the current date
- [ ] Header shows the current date range label (e.g., "March 2026", "Mar 9 - 15, 2026", "March 12, 2026")
- [ ] View selection and current date persist in URL search params
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-006: Create task from calendar (admin only)
**Description:** As an admin, I want to click a date on the calendar to create a new task with that date pre-filled.

**Acceptance Criteria:**
- [ ] Clicking an empty area of a day cell opens the existing task creation modal
- [ ] `start_date` is pre-filled with the clicked date
- [ ] In month view, clicking a cell pre-fills `start_date` only
- [ ] In week view, clicking a day column pre-fills `start_date`
- [ ] On successful creation, the calendar refreshes and shows the new task
- [ ] Field users do NOT see the click-to-create affordance
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-007: Drag and drop to reschedule (admin only)
**Description:** As an admin, I want to drag a task to a different date to reschedule it quickly.

**Acceptance Criteria:**
- [ ] Admin can drag a task bar/chip to a new date in month view
- [ ] Dragging updates `start_date` (and shifts `end_date` by the same delta to preserve duration)
- [ ] Drag-and-drop uses a headless DnD library (`@dnd-kit/core`)
- [ ] Visual drag preview shows the task bar following the cursor
- [ ] Drop target highlights on hover
- [ ] On drop, optimistically updates the UI then calls `updateTask` server action
- [ ] Shows toast on success ("Task rescheduled") or error
- [ ] Field users cannot drag tasks (no drag handles shown)
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-008: Resize task duration (admin only)
**Description:** As an admin, I want to drag the edge of a task bar to extend or shorten its duration.

**Acceptance Criteria:**
- [ ] In week view, task bars have a drag handle on the right edge
- [ ] Dragging the right edge changes `end_date` without moving `start_date`
- [ ] Minimum duration is 1 day
- [ ] Optimistic UI update + server action call
- [ ] Field users cannot resize
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-009: Server action for calendar data
**Description:** As a developer, I need an efficient query to fetch tasks for a date range.

**Acceptance Criteria:**
- [ ] New server action `getCalendarTasks(startDate, endDate, scope?)` in `lib/calendar/actions.ts`
- [ ] Returns tasks where date ranges overlap: `start_date <= endDate AND end_date >= startDate`
- [ ] Also returns tasks with only `start_date` within range
- [ ] Filters soft-deleted tasks (`.is('deleted_at', null)`)
- [ ] Includes: `id, title, start_date, end_date, status(name, color, is_complete), division(name, color), assigned_user(email)`
- [ ] Respects configurable scope setting (own tasks / division / all)
- [ ] `npm run typecheck` passes

### US-010: Configurable calendar scope
**Description:** As a deployment admin, I want to configure what tasks field users can see on the calendar.

**Acceptance Criteria:**
- [ ] New setting in branding/config: `calendar_scope` with values `own` | `division` | `all`
- [ ] Default: `own` (field users see only their assigned tasks)
- [ ] Admins always see all tasks regardless of setting
- [ ] Setting stored in `branding` table or a new `settings` table
- [ ] `getCalendarTasks` respects this setting for non-admin users
- [ ] `npm run typecheck` passes

### US-011: Mini-calendar dashboard widget
**Description:** As a user, I want a mini-calendar on my dashboard showing task density per day.

**Acceptance Criteria:**
- [ ] Small month-view calendar widget in the dashboard sidebar area
- [ ] Shows on both admin dashboard (`/admin/dashboard`) and field user dashboard
- [ ] Each day cell shows a dot or count badge indicating number of tasks
- [ ] Color intensity or dot count reflects task density (1-2 = light, 3+ = bold)
- [ ] Clicking a day navigates to the appropriate calendar route (`/admin/calendar?view=day&date=YYYY-MM-DD` or `/calendar?view=day&date=YYYY-MM-DD`)
- [ ] Shows current month with prev/next navigation
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

### US-012: Mobile-responsive calendar
**Description:** As a field user on mobile, I want the calendar to be usable on small screens.

**Acceptance Criteria:**
- [ ] Month view shows abbreviated day names and compact cells on mobile
- [ ] Task bars show as colored dots/chips (no text) on mobile month view, with count badge for overflow
- [ ] Tapping a day cell expands to show task list (bottom sheet or inline expand)
- [ ] Week view scrolls horizontally on mobile
- [ ] Day view works naturally on mobile (vertical list)
- [ ] Touch targets meet 48px minimum
- [ ] `npm run typecheck` passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Calendar page accessible at `/admin/calendar` (admin) and `/calendar` (field user)
- FR-2: Three selectable views: Month, Week, Day
- FR-3: Tasks with `start_date` and `end_date` render as multi-day horizontal bars
- FR-4: Tasks with only `start_date` render as single-day chips
- FR-5: Task bars are colored by division color with status dot indicator
- FR-6: Clicking a task opens the existing task detail/edit modal
- FR-7: Admins can click empty date cells to create tasks with pre-filled dates
- FR-8: Admins can drag tasks to reschedule (preserving duration)
- FR-9: Admins can resize task bars to change end date
- FR-10: Field users get a read-only calendar (no drag, no create-by-click)
- FR-11: Calendar data fetched via server action with date range filter
- FR-12: Optimistic UI updates on drag/resize with server action confirmation
- FR-13: View type and current date stored in URL search params
- FR-14: Mini-calendar widget on admin dashboard shows task density per day
- FR-15: Calendar scope configurable per deployment (own / division / all tasks)
- FR-16: Mobile-responsive with touch-friendly interactions

## Non-Goals

- No recurring/repeating task support
- No time-of-day scheduling (tasks are date-level, not hour-level)
- No calendar sync (Google Calendar, iCal export)
- No resource/capacity planning view
- No inline task editing from the calendar (opens existing modal instead)
- No multi-select drag for bulk rescheduling

## Design Considerations

- Match existing design system: OKLCH color space, electric blue/cyan palette
- Use `.glass` and `.glass-border` for calendar card containers
- Division colors applied via inline styles (existing pattern: `${color}15` for backgrounds)
- Status colors shown as small dots on task bars
- Dark mode support via existing `.dark` class system
- Segmented control for view switcher using shadcn Toggle Group or custom
- Calendar grid built with CSS Grid for clean alignment
- Drag preview uses subtle shadow/scale transform
- Today cell gets a ring highlight using `--electric-500`
- Mini-calendar widget styled to match existing dashboard cards (rounded-2xl, border-border/50)

## Technical Considerations

- **DnD library**: `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop (headless, works with React 19)
- **Calendar logic**: Build custom grid rendering (no heavy calendar library). Date math with native `Date` or lightweight `date-fns` functions
- **Data fetching**: Server action `getCalendarTasks()` with date range overlap query
- **Optimistic updates**: Use React `useOptimistic` or local state for instant drag feedback
- **URL state**: View type and date in search params (`?view=month&date=2026-03-12`)
- **Existing integration**: Reuse `TaskModal` for create/edit, reuse `updateTask` server action for drag/resize
- **Performance**: Fetch only the visible date range. Month view fetches ~35 days, week view ~7, day view ~1
- **Task overlap in DB query**: `WHERE start_date <= :rangeEnd AND (end_date >= :rangeStart OR (end_date IS NULL AND start_date >= :rangeStart))`

## Success Metrics

- Admin can reschedule a task in 1 drag action (vs. open task > edit dates > save)
- Calendar loads in < 500ms for up to 100 tasks in view
- Field users can see their upcoming schedule without navigating task lists
- Dashboard mini-calendar gives at-a-glance workload visibility

## Resolved Decisions

- **Completed tasks**: Show with reduced opacity, filterable via toggle
- **Weekend drag**: No confirmation prompt - allow freely
- **Mini-calendar widget**: Show on both admin and field user dashboards
