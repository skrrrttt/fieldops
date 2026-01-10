# PRD: Field Management App (FieldOps)

## Introduction

A progressive web app (PWA) for field service companies to manage tasks, upload documentation, and coordinate between office admins and field crews. Built for harsh conditions — usable with gloves, on tablets in direct sunlight, and fully functional offline.

While designed with pavement marking operations in mind, the app is industry-agnostic with full customization capabilities. Field users get a streamlined mobile experience focused on photos, files, and task updates. Admins get a powerful web dashboard for configuration and oversight.

**Tech Stack:**
- Frontend: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL, Auth, Storage, Realtime)
- Offline: Service Workers, IndexedDB, Background Sync API
- PWA: Installable on iOS/Android/Desktop

---

## Goals

- Enable field crews to work completely offline and sync when connectivity returns
- Provide touch-friendly UI that works with gloves (large tap targets, minimal typing)
- Allow admins to fully customize fields, divisions, statuses, and branding
- Support photo uploads with compression and offline queuing
- Deliver sub-3-second load times on mobile networks
- Match or exceed UX quality of top field service apps (Jobber, ServiceTitan mobile)

---

## User Stories

### US-001: User Authentication
**Description:** As a user, I want to log in securely so that I can access my company's tasks.

**Acceptance Criteria:**
- [ ] Email/password authentication via Supabase Auth
- [ ] "Remember me" keeps user logged in for 30 days
- [ ] Session persists offline (cached credentials)
- [ ] Role-based redirect: Admin → Dashboard, Field User → Task List
- [ ] npm run typecheck passes

---

### US-002: View Task List (Field User)
**Description:** As a field user, I want to see all tasks so I can plan my work and help teammates.

**Acceptance Criteria:**
- [ ] Task list shows ALL tasks (not filtered by assignment)
- [ ] Task list loads from cache when offline
- [ ] Each task card shows: title, status, division/flag, location, due date, assigned user
- [ ] Cards are large (min 72px height) with high-contrast text
- [ ] Pull-to-refresh syncs with server when online
- [ ] Filter by status (All, To Do, In Progress, Complete)
- [ ] Filter by division/flag
- [ ] Filter by assigned user (optional)
- [ ] Visual indicator when offline (banner or icon)
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-003: View Task Detail (Field User)
**Description:** As a field user, I want to view task details so I know what work is required.

**Acceptance Criteria:**
- [ ] Full task details displayed: description, custom fields, location, files, photos, comments
- [ ] Map preview showing job location (static image for offline, interactive when online)
- [ ] All attached files/photos viewable offline (cached on first sync)
- [ ] Large "Update Status" button always visible
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-004: Update Task Status (Field User)
**Description:** As a field user, I want to update a task's status so the office knows my progress.

**Acceptance Criteria:**
- [ ] Status options pulled from admin-configured list (e.g., To Do, In Progress, Complete, Blocked)
- [ ] Single-tap status selection (large buttons, no dropdowns)
- [ ] Change queued locally if offline
- [ ] Optimistic UI update with sync indicator
- [ ] Timestamp recorded for status change
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Upload Photos (Field User)
**Description:** As a field user, I want to upload photos of work (before/after) so there's documentation.

**Acceptance Criteria:**
- [ ] Camera access for direct photo capture
- [ ] Gallery picker for existing photos
- [ ] Photos compressed client-side before upload (max 1920px, 80% quality)
- [ ] **Photos auto-watermarked with timestamp and GPS coordinates (bottom corner, semi-transparent)**
- [ ] Photos queued in IndexedDB when offline
- [ ] Upload progress indicator when syncing
- [ ] Photos tagged with metadata: timestamp, GPS, uploader name
- [ ] Support multiple photos per upload (batch)
- [ ] Large "Take Photo" button (min 64px tall)
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-006: Upload Files (Field User)
**Description:** As a field user, I want to attach files to tasks for documentation.

**Acceptance Criteria:**
- [ ] File picker supporting common formats (PDF, DOC, XLS, images)
- [ ] Max file size: 25MB per file
- [ ] Files queued locally when offline
- [ ] Upload progress indicator
- [ ] File name and size displayed after attachment
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-007: Add Comments (Field User)
**Description:** As a field user, I want to add comments to tasks so I can communicate with the office.

**Acceptance Criteria:**
- [ ] Text input with large keyboard-friendly field
- [ ] Voice-to-text option (native browser API)
- [ ] Comments queued locally when offline
- [ ] Timestamp and author shown on each comment
- [ ] Comments sorted newest-first
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-008: View Comments (Field User)
**Description:** As a field user, I want to read comments on a task so I have context.

**Acceptance Criteria:**
- [ ] All comments visible on task detail page
- [ ] Comments cached for offline viewing
- [ ] Clear visual distinction between users
- [ ] Timestamps in relative format ("2 hours ago")
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-009: Offline Mode & Sync
**Description:** As a field user, I want the app to work offline so I can use it in areas without signal.

**Acceptance Criteria:**
- [ ] App shell cached via Service Worker (works offline immediately)
- [ ] Task data cached in IndexedDB
- [ ] All writes (status, photos, comments, files) queued locally
- [ ] Background Sync API triggers upload when online
- [ ] Sync status indicator (Synced, Syncing, Pending X changes)
- [ ] Conflict detection: flag conflicting edits for manual review
- [ ] Auto-merge non-conflicting changes silently
- [ ] Manual "Sync Now" button
- [ ] npm run typecheck passes

---

### US-010: GPS Location for Tasks
**Description:** As a field user, I want to see job locations on a map so I can navigate to them.

**Acceptance Criteria:**
- [ ] Each task can have a GPS coordinate (lat/lng) and/or address
- [ ] Map thumbnail on task card (static image)
- [ ] Full map on task detail page
- [ ] "Get Directions" button opens native maps app (Google Maps/Apple Maps)
- [ ] Geolocation captured when photos uploaded (optional, with permission)
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-011: Admin Dashboard - Task Management
**Description:** As an admin, I want to create and manage tasks so field users have work assigned.

**Acceptance Criteria:**
- [ ] Create task with: title, description, status, division, location, due date, assigned user
- [ ] Edit any task field
- [ ] Delete task (soft delete, recoverable)
- [ ] Bulk actions: assign, change status, delete
- [ ] Table view with sorting and filtering
- [ ] Search by title, description, or ID
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Admin Dashboard - View All Media
**Description:** As an admin, I want to view all uploaded photos and files so I can review documentation.

**Acceptance Criteria:**
- [ ] Gallery view of all photos across tasks
- [ ] Filter by task, user, date range, division
- [ ] Click to view full-size with metadata (timestamp, GPS, uploader)
- [ ] Download individual or bulk files
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Admin - Custom Fields
**Description:** As an admin, I want to add custom fields to tasks so I can capture industry-specific data.

**Acceptance Criteria:**
- [ ] Add custom field with: name, type (text, number, date, dropdown, checkbox), required flag
- [ ] Dropdown fields support custom option lists
- [ ] Reorder fields via drag-and-drop
- [ ] Fields appear on task create/edit forms
- [ ] Fields appear on task detail view
- [ ] Fields sync to offline cache
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Admin - Divisions/Flags
**Description:** As an admin, I want to create divisions or flags so tasks can be categorized.

**Acceptance Criteria:**
- [ ] Create division with: name, color, icon (optional)
- [ ] Edit and delete divisions
- [ ] Assign division to tasks
- [ ] Filter task list by division
- [ ] Division badge visible on task cards
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-015: Admin - Custom Statuses
**Description:** As an admin, I want to define custom task statuses so workflows match my business.

**Acceptance Criteria:**
- [ ] Create status with: name, color, order
- [ ] Set default status for new tasks
- [ ] Mark statuses as "complete" (affects reporting)
- [ ] Reorder statuses via drag-and-drop
- [ ] Statuses sync to field user devices
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-016: Admin - User Management
**Description:** As an admin, I want to manage users so I can control access.

**Acceptance Criteria:**
- [ ] Invite user via email
- [ ] Assign role: Admin or Field User
- [ ] Deactivate user (preserves history, revokes access)
- [ ] View user list with role and last active date
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-017: Admin - Branding & White-Label
**Description:** As an admin, I want to customize branding so the app reflects my company.

**Acceptance Criteria:**
- [ ] Upload company logo (displayed in header/splash)
- [ ] Set primary and accent colors
- [ ] Custom app name (shown in PWA install)
- [ ] Colors apply to buttons, headers, status badges
- [ ] Branding cached for offline use
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-018: Admin - Task Templates
**Description:** As an admin, I want to create task templates so common job types can be created quickly.

**Acceptance Criteria:**
- [ ] Create template with: name, default title, default description, default division, default custom field values
- [ ] Edit and delete templates
- [ ] Templates listed in a dedicated admin section
- [ ] When creating a new task, option to "Create from Template" with dropdown
- [ ] Template pre-fills all configured fields (user can override before saving)
- [ ] Templates sync to field user devices for offline task creation
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-019: PWA Installation
**Description:** As a user, I want to install the app on my device so it feels native.

**Acceptance Criteria:**
- [ ] Web App Manifest with icons (192px, 512px)
- [ ] "Add to Home Screen" prompt on supported browsers
- [ ] Standalone display mode (no browser chrome)
- [ ] Splash screen with company logo
- [ ] Works on iOS Safari, Android Chrome, Desktop Chrome/Edge
- [ ] npm run typecheck passes

---

### US-020: Responsive Layout - Mobile First
**Description:** As a field user on a phone or tablet, I want large touch targets so I can use it with gloves.

**Acceptance Criteria:**
- [ ] Minimum touch target: 48x48px (accessible), preferred 64px for primary actions
- [ ] No hover-dependent interactions
- [ ] Bottom navigation for primary actions (thumb-friendly)
- [ ] Font size minimum 16px for body text
- [ ] High contrast mode support
- [ ] Landscape and portrait orientations supported
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### US-021: Web Dashboard - Enhanced View
**Description:** As an admin on desktop, I want additional features and denser information display.

**Acceptance Criteria:**
- [ ] Side navigation with expanded labels
- [ ] Multi-column layouts for task list (table view option)
- [ ] Keyboard shortcuts for common actions
- [ ] Bulk selection with Shift+Click
- [ ] Export data to CSV
- [ ] npm run typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-1: Authenticate users via Supabase Auth (email/password)
- FR-2: Role-based access control: Admin (full access + configuration), Field User (view all tasks, update status, upload photos/files, comment)
- FR-3: Tasks stored in Supabase PostgreSQL with fields: id, title, description, status_id, division_id, location (lat/lng + address), due_date, assigned_user_id, created_at, updated_at
- FR-4: Custom fields stored as JSONB on tasks with schema defined in admin settings
- FR-5: Photos stored in Supabase Storage with references in database; compressed and watermarked client-side (timestamp + GPS overlay)
- FR-6: Files stored in Supabase Storage with 25MB limit
- FR-7: Comments stored with task_id, user_id, content, created_at
- FR-8: Offline data cached in IndexedDB using a sync-friendly schema
- FR-9: Service Worker caches app shell and static assets
- FR-10: Background Sync API queues offline writes for later upload
- FR-11: Conflict resolution: compare updated_at timestamps; non-conflicting fields auto-merge; conflicting fields flagged
- FR-12: GPS coordinates captured via Geolocation API on photo upload (with permission)
- FR-13: Admin settings (custom fields, statuses, divisions, branding) stored in database and synced to clients
- FR-14: PWA manifest and service worker enable "Add to Home Screen"
- FR-15: All admin configuration changes propagate to field users on next sync
- FR-16: Task templates stored in database with default values; available during task creation

---

## Non-Goals

- No native iOS/Android apps (PWA only for v1)
- No real-time chat or messaging between users
- No scheduling/calendar integration (v1)
- No invoicing or payment processing
- No customer-facing portal
- No automated notifications (push notifications deferred to v2)
- No route optimization for multiple jobs
- No time tracking or timesheets
- No integration with accounting software (v1)

---

## Design Considerations

### Mobile/Tablet (Field Users)
- Dark mode support for outdoor readability
- Large buttons (64px+) for gloved operation
- Minimal text input; prefer taps, toggles, and photo capture
- Bottom navigation bar with 4 max items: Tasks, Upload, Sync Status, Profile
- Card-based task list (not table)
- Swipe gestures for quick actions (optional enhancement)

### Desktop (Admins)
- Sidebar navigation with collapsible sections
- Data tables with sorting, filtering, column customization
- Modal dialogs for create/edit flows
- Drag-and-drop for reordering (statuses, custom fields)
- Dashboard with summary stats (tasks by status, recent uploads)

### Shared
- Consistent color system from admin branding
- Loading skeletons for perceived performance
- Toast notifications for actions (synced, error, etc.)
- Empty states with helpful prompts

---

## Technical Considerations

### Offline Architecture
- **Service Worker:** Workbox for caching strategies (stale-while-revalidate for API, cache-first for assets)
- **IndexedDB:** Dexie.js wrapper for structured offline storage
- **Sync Queue:** Custom queue manager tracking pending mutations with retry logic
- **Conflict Resolution:** Version vectors or updated_at comparison; UI for manual conflict resolution

### Supabase Setup
- Row Level Security (RLS) policies for multi-user access control
- Storage buckets: `photos`, `files` with size limits
- Realtime subscriptions for admin dashboard (optional)
- Edge Functions for image processing if needed

### Performance
- Next.js App Router with streaming SSR
- Image optimization via next/image and client-side compression
- Code splitting by route
- Lazy load admin features (not needed on field devices)
- Target: Lighthouse score 90+ on mobile

### Security
- HTTPS only
- Supabase RLS for data isolation
- Sanitize file uploads (check MIME types)
- Rate limiting on auth endpoints
- No sensitive data in localStorage (use IndexedDB with care)

---

## Success Metrics

- Field users can complete task updates with 3 taps or fewer
- App loads in under 3 seconds on 3G connection (after install)
- 100% offline functionality for core workflows (view, status update, photo upload)
- Sync conflicts occur in <1% of operations
- 90+ Lighthouse performance score on mobile
- Successful PWA installation rate >50% of active users

---

## Resolved Questions

1. **Photos watermarked?** YES — auto-stamp timestamp + GPS in corner
2. **Field user task visibility?** ALL tasks visible (not just assigned)
3. **Private notes vs comments?** NO — general comments only, all shared
4. **Task templates?** YES — admin-customizable templates for common job types
5. **Required photos per task?** NO — not needed for v1
6. **Division hierarchy?** NO — flat structure for now
7. **Expected volume?** ~30 photos/month (low volume; minimal storage costs)

---

## Storage Estimates

Based on ~30 photos/month:
- **Photo storage:** ~15MB/month (500KB avg compressed) = ~180MB/year
- **File storage:** Minimal (occasional PDFs)
- **Database:** <1GB for task/user data
- **Supabase Free Tier:** Likely sufficient for initial launch (1GB database, 1GB storage)

---

## Implementation Priority (Suggested)

**Phase 1 - Core MVP:**
- Authentication (US-001)
- Task list and detail views (US-002, US-003)
- Status updates (US-004)
- Photo upload with offline queue (US-005)
- Offline mode and sync (US-009)
- PWA setup (US-019)
- Mobile-first responsive layout (US-020)

**Phase 2 - Full Field Features:**
- File uploads (US-006)
- Comments (US-007, US-008)
- GPS/location features (US-010)

**Phase 3 - Admin Power:**
- Task management dashboard (US-011)
- Media gallery (US-012)
- Custom fields (US-013)
- Divisions/flags (US-014)
- Custom statuses (US-015)
- User management (US-016)
- Branding (US-017)
- Task templates (US-018)
- Enhanced web dashboard (US-021)

---

*PRD generated by Claude Code PRD Skill*
