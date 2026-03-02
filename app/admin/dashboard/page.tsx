import { requireAdmin } from '@/lib/auth/actions';
import { getDashboardStats } from '@/lib/dashboard/actions';
import { AdminLayout } from '@/components/admin/admin-layout';
import { DashboardContent } from '@/components/admin/dashboard/dashboard-content';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
  const [user, stats] = await Promise.all([
    requireAdmin(),
    getDashboardStats(),
  ]);

  // Compute photo URLs server-side to avoid client-side Supabase dependency
  const supabase = await createClient();
  const photoUrls: Record<string, string> = {};
  for (const upload of stats.recentUploads) {
    photoUrls[upload.id] = supabase.storage
      .from('photos')
      .getPublicUrl(upload.storage_path).data.publicUrl;
  }

  return (
    <AdminLayout user={user}>
      <DashboardContent stats={stats} photoUrls={photoUrls} />
    </AdminLayout>
  );
}
