import { requireAuth } from '@/lib/auth/actions';
import { getTask } from '@/lib/tasks/actions';
import { getTaskPhotos } from '@/lib/photos/actions';
import { getTaskFiles } from '@/lib/files/actions';
import { getTaskComments } from '@/lib/comments/actions';
import { getCustomFields } from '@/lib/custom-fields/actions';
import { TaskDetailOfflineWrapper } from '@/components/tasks/task-detail-offline-wrapper';
import { DetailHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch task and related data (may be null if offline or not found)
  const [task, customFields] = await Promise.all([
    getTask(id),
    getCustomFields(),
  ]);
  const photos = task ? await getTaskPhotos(id) : [];
  const files = task ? await getTaskFiles(id) : [];
  const comments = task ? await getTaskComments(id) : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-24">
      {/* Header */}
      <DetailHeader title="Task Details" backHref="/tasks" />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        <TaskDetailOfflineWrapper
          taskId={id}
          task={task}
          photos={photos}
          files={files}
          comments={comments}
          customFields={customFields}
        />
      </main>

      {/* Bottom nav spacer */}
      <MobileBottomNavSpacer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
