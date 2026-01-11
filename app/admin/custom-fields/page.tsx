import { requireAdmin } from '@/lib/auth/actions';
import { getCustomFields, getNextCustomFieldOrder } from '@/lib/custom-fields/actions';
import { CreateCustomFieldForm } from '@/components/admin/custom-fields/create-custom-field-form';
import { CustomFieldList } from '@/components/admin/custom-fields/custom-field-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminCustomFieldsPage() {
  const user = await requireAdmin();
  const fields = await getCustomFields();
  const nextOrder = await getNextCustomFieldOrder();

  return (
    <AdminLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Custom Fields
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Add custom fields to tasks for industry-specific data. These fields will appear on task create/edit forms.
          </p>
        </div>

        {/* Create Custom Field Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Field
          </h3>
          <CreateCustomFieldForm nextOrder={nextOrder} />
        </div>

        {/* Existing Custom Fields List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Existing Fields ({fields.length})
          </h3>
          <CustomFieldList fields={fields} />
        </div>
      </div>
    </AdminLayout>
  );
}
