import { getDashboardStats } from '@/lib/dashboard/actions';
import { DashboardContent } from '@/components/admin/dashboard/dashboard-content';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  // Compute photo URLs server-side to avoid client-side Supabase dependency
  const supabase = await createClient();
  const photoUrls: Record<string, string> = {};
  for (const upload of stats.recentUploads) {
    photoUrls[upload.id] = supabase.storage
      .from('photos')
      .getPublicUrl(upload.storage_path).data.publicUrl;
  }

  return <DashboardContent stats={stats} photoUrls={photoUrls} />;
}
