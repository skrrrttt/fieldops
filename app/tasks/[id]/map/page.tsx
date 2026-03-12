import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/actions';
import { getTaskSegments } from '@/lib/maps/actions';
import { TaskMapOfflineWrapper } from '@/components/tasks/task-map-offline-wrapper';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskMapPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;

  const assignments = await getTaskSegments(id);

  if (assignments.length === 0) {
    notFound();
  }

  return <TaskMapOfflineWrapper taskId={id} assignments={assignments} />;
}
