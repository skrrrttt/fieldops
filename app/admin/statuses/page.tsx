import { requireAdmin } from '@/lib/auth/actions';
import { getStatuses, getNextStatusOrder } from '@/lib/statuses/actions';
import { CreateStatusForm } from '@/components/admin/statuses/create-status-form';
import { StatusList } from '@/components/admin/statuses/status-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminStatusesPage() {
  const user = await requireAdmin();
  const statuses = await getStatuses();
  const nextOrder = await getNextStatusOrder();

  return (
    <AdminLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Task Statuses
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Define custom task statuses to match your workflow. Drag and drop to reorder.
          </p>
        </div>

        {/* Create Status Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Status
          </h3>
          <CreateStatusForm nextOrder={nextOrder} />
        </div>

        {/* Existing Statuses List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Existing Statuses ({statuses.length})
          </h3>
          <StatusList statuses={statuses} />
        </div>
      </div>
    </AdminLayout>
  );
}
