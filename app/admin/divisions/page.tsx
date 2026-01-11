import { requireAdmin } from '@/lib/auth/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { CreateDivisionForm } from '@/components/admin/divisions/create-division-form';
import { DivisionList } from '@/components/admin/divisions/division-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminDivisionsPage() {
  const user = await requireAdmin();
  const divisions = await getDivisions();

  return (
    <AdminLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Divisions
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Create and manage divisions or flags to categorize tasks.
          </p>
        </div>

        {/* Create Division Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Division
          </h3>
          <CreateDivisionForm />
        </div>

        {/* Existing Divisions List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Existing Divisions ({divisions.length})
          </h3>
          <DivisionList divisions={divisions} />
        </div>
      </div>
    </AdminLayout>
  );
}
