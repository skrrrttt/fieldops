import { requireAdmin } from '@/lib/auth/actions';
import { getChecklistsWithItems, getNextChecklistOrder } from '@/lib/checklists/actions';
import { CreateChecklistForm } from '@/components/admin/checklists/create-checklist-form';
import { ChecklistList } from '@/components/admin/checklists/checklist-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminChecklistsPage() {
  const user = await requireAdmin();
  const checklists = await getChecklistsWithItems();
  const nextOrder = await getNextChecklistOrder();

  return (
    <AdminLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Checklists
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Create reusable checklists that can be attached to tasks. Field users can check off items as they complete them.
          </p>
        </div>

        {/* Create Checklist Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Checklist
          </h3>
          <CreateChecklistForm nextOrder={nextOrder} />
        </div>

        {/* Existing Checklists List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Existing Checklists ({checklists.length})
          </h3>
          <ChecklistList checklists={checklists} />
        </div>
      </div>
    </AdminLayout>
  );
}
