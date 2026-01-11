import { requireAdmin } from '@/lib/auth/actions';
import { getAllPhotos, getTasksWithPhotos, getUsersWithPhotos } from '@/lib/photos/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { MediaGallery } from '@/components/admin/media/media-gallery';
import { AdminLayout } from '@/components/admin/admin-layout';

interface PageProps {
  searchParams: Promise<{
    taskId?: string;
    userId?: string;
    divisionId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminMediaPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const params = await searchParams;

  // Fetch all required data in parallel
  const [photos, tasks, users, divisions] = await Promise.all([
    getAllPhotos({
      taskId: params.taskId,
      userId: params.userId,
      divisionId: params.divisionId,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    getTasksWithPhotos(),
    getUsersWithPhotos(),
    getDivisions(),
  ]);

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Media Gallery
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            View and download all photos uploaded across tasks.
          </p>
        </div>

        <MediaGallery
          photos={photos}
          tasks={tasks}
          users={users}
          divisions={divisions}
          initialFilters={{
            taskId: params.taskId || '',
            userId: params.userId || '',
            divisionId: params.divisionId || '',
            startDate: params.startDate || '',
            endDate: params.endDate || '',
          }}
        />
      </div>
    </AdminLayout>
  );
}
