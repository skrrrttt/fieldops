import { requireAuth } from '@/lib/auth/actions';
import { LogoutButton } from '@/components/auth/logout-button';
import { TaskListOfflineWrapper } from '@/components/tasks/task-list-offline-wrapper';
import { getTasks } from '@/lib/tasks/actions';
import { getStatuses } from '@/lib/statuses/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { AppHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

export default async function TasksPage() {
  const user = await requireAuth();

  // Fetch all data needed for the task list
  const [tasksResult, statuses, divisions] = await Promise.all([
    getTasks({ pageSize: 100 }), // Fetch more tasks for field users
    getStatuses(),
    getDivisions(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <AppHeader
        subtitle="Tasks"
        href="/tasks"
        className="bg-white dark:bg-zinc-800"
      >
        <span className="text-base text-zinc-600 dark:text-zinc-400 desktop-only">
          {user.email}
        </span>
        <span className="desktop-only">
          <LogoutButton />
        </span>
      </AppHeader>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <TaskListOfflineWrapper
          tasks={tasksResult.tasks}
          statuses={statuses}
          divisions={divisions}
        />
      </main>

      {/* Bottom nav spacer - prevents content from being hidden behind nav */}
      <MobileBottomNavSpacer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
