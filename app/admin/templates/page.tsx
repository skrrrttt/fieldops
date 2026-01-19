import { requireAdmin } from '@/lib/auth/actions';
import { getTemplatesWithDivision } from '@/lib/templates/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { getCustomFields } from '@/lib/custom-fields/actions';
import { getUsers } from '@/lib/users/actions';
import { CreateTemplateForm } from '@/components/admin/templates/create-template-form';
import { TemplateList } from '@/components/admin/templates/template-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminTemplatesPage() {
  const user = await requireAdmin();
  const [templates, divisions, customFields, users] = await Promise.all([
    getTemplatesWithDivision(),
    getDivisions(),
    getCustomFields(),
    getUsers(),
  ]);

  return (
    <AdminLayout user={user}>
      <div className="max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Task Templates
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Create templates for common job types. Templates pre-fill task fields when creating new tasks,
            saving time and ensuring consistency.
          </p>
        </div>

        {/* Create Template Form */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Create New Template
          </h3>
          <CreateTemplateForm divisions={divisions} customFields={customFields} users={users} />
        </div>

        {/* Existing Templates List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Existing Templates ({templates.length})
          </h3>
          <TemplateList templates={templates} divisions={divisions} customFields={customFields} users={users} />
        </div>
      </div>
    </AdminLayout>
  );
}
