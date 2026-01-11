import { requireAdmin } from '@/lib/auth/actions';
import { getCustomFields } from '@/lib/custom-fields/actions';
import { AdminLayout } from '@/components/admin/admin-layout';
import { CustomFieldResponsesTable } from '@/components/admin/responses/custom-field-responses-table';
import { createClient } from '@/lib/supabase/server';

export default async function AdminResponsesPage() {
  const user = await requireAdmin();
  const customFields = await getCustomFields();
  const supabase = await createClient();

  // Fetch all tasks with their custom fields
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      custom_fields,
      created_at,
      division:divisions(id, name, color, icon),
      status:statuses(id, name, color)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Custom Field Responses
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            View all task responses to custom fields. Filter by field to see specific answers.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <CustomFieldResponsesTable
            tasks={tasks || []}
            customFields={customFields}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
