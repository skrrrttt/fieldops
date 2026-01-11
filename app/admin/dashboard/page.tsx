import { requireAdmin } from '@/lib/auth/actions';
import { getDashboardStats } from '@/lib/dashboard/actions';
import { AdminLayout } from '@/components/admin/admin-layout';
import { DashboardContent } from '@/components/admin/dashboard/dashboard-content';

export default async function AdminDashboardPage() {
  const user = await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <AdminLayout user={user}>
      <DashboardContent stats={stats} />
    </AdminLayout>
  );
}
