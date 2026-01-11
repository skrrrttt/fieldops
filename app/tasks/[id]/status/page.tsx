import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/actions';
import { getTask } from '@/lib/tasks/actions';
import { getStatuses } from '@/lib/statuses/actions';
import { StatusUpdateUI } from '@/components/tasks/status-update-ui';
import { DetailHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

interface StatusUpdatePageProps {
  params: Promise<{ id: string }>;
}

export default async function StatusUpdatePage({ params }: StatusUpdatePageProps) {
  await requireAuth();
  const { id } = await params;

  const [task, statuses] = await Promise.all([
    getTask(id),
    getStatuses(),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <DetailHeader title="Update Status" backHref={`/tasks/${id}`} />

      {/* Task title subtitle */}
      <div className="max-w-3xl mx-auto px-4 pt-2 pb-0">
        <p className="text-base text-zinc-500 dark:text-zinc-400 truncate">
          {task.title}
        </p>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <StatusUpdateUI
          taskId={task.id}
          currentStatusId={task.status_id}
          statuses={statuses}
        />
      </main>

      {/* Bottom nav spacer */}
      <MobileBottomNavSpacer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
