import { requireAdmin } from '@/lib/auth/actions';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdmin();

  return <AdminLayout user={user}>{children}</AdminLayout>;
}
