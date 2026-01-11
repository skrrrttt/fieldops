import { requireAdmin } from '@/lib/auth/actions';
import { getBranding } from '@/lib/branding/actions';
import { BrandingForm } from '@/components/admin/branding/branding-form';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminBrandingPage() {
  const user = await requireAdmin();
  const branding = await getBranding();

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Branding & White-Label
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Customize the appearance of your app with your company branding.
          </p>
        </div>

        <BrandingForm initialBranding={branding} />
      </div>
    </AdminLayout>
  );
}
