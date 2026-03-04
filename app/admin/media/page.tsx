import { getAllPhotos, getTasksWithPhotos, getUsersWithPhotos } from '@/lib/photos/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { MediaGallery } from '@/components/admin/media/media-gallery';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Media Gallery
        </h1>
        <p className="text-muted-foreground mt-1">
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
  );
}
