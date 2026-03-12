import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/actions';
import { getTask } from '@/lib/tasks/actions';
import { getTaskPhotos } from '@/lib/photos/actions';
import { getTaskFiles } from '@/lib/files/actions';
import { getTaskComments } from '@/lib/comments/actions';
import { getCustomFields } from '@/lib/custom-fields/actions';
import { getTaskChecklists } from '@/lib/checklists/actions';
import { taskHasSegments } from '@/lib/maps/actions';
import { TaskDetailOfflineWrapper } from '@/components/tasks/task-detail-offline-wrapper';
import { DetailHeader } from '@/components/layout/app-header';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/layout/mobile-bottom-nav';

interface TaskDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch all data in a single parallel batch to eliminate waterfall
  const [task, customFields, photos, files, comments, taskChecklists, hasStripingMap] = await Promise.all([
    getTask(id),
    getCustomFields(),
    getTaskPhotos(id),
    getTaskFiles(id),
    getTaskComments(id),
    getTaskChecklists(id),
    taskHasSegments(id),
  ]);

  if (!task) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background pb-24">
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
          taskChecklists={taskChecklists}
          hasStripingMap={hasStripingMap}
        />
      </main>

      {/* Bottom nav spacer */}
      <MobileBottomNavSpacer />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
