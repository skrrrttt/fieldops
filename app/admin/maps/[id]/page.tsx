import { notFound } from 'next/navigation';
import { getStripingMap, getTasksForAssignment } from '@/lib/maps/actions';
import { MapEditorWrapper } from '@/components/admin/maps/map-editor-wrapper';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MapEditorPage({ params }: PageProps) {
  const { id } = await params;
  const [map, tasks] = await Promise.all([
    getStripingMap(id),
    getTasksForAssignment(),
  ]);

  if (!map) {
    notFound();
  }

  return <MapEditorWrapper map={map} tasks={tasks} />;
}
