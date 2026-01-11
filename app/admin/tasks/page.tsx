import { requireAdmin } from '@/lib/auth/actions';
import { getTasks, getUsers, getDefaultStatus } from '@/lib/tasks/actions';
import { getStatuses } from '@/lib/statuses/actions';
import { getDivisions } from '@/lib/divisions/actions';
import { getCustomFields } from '@/lib/custom-fields/actions';
import { getTemplates } from '@/lib/templates/actions';
import { TaskTable } from '@/components/admin/tasks/task-table';
import { AdminLayout } from '@/components/admin/admin-layout';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    sortBy?: string;
    sortOrder?: string;
    status?: string;
    division?: string;
    user?: string;
    search?: string;
    action?: string;
  }>;
}

export default async function AdminTasksPage({ searchParams }: PageProps) {
  const user = await requireAdmin();
  const params = await searchParams;

  const page = parseInt(params.page || '1', 10);
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';
  const statusId = params.status || '';
  const divisionId = params.division || '';
  const assignedUserId = params.user || '';
  const search = params.search || '';

  // Fetch data in parallel
  const [tasksResult, statuses, divisions, users, defaultStatusId, customFields, templates] = await Promise.all([
    getTasks({
      page,
      pageSize: 25,
      sortBy,
      sortOrder,
      statusId: statusId || undefined,
      divisionId: divisionId || undefined,
      assignedUserId: assignedUserId || undefined,
      search: search || undefined,
    }),
    getStatuses(),
    getDivisions(),
    getUsers(),
    getDefaultStatus(),
    getCustomFields(),
    getTemplates(),
  ]);

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Task Management
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            View and manage all tasks. Click column headers to sort, use filters to narrow results.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
          <TaskTable
            tasks={tasksResult.tasks}
            total={tasksResult.total}
            page={tasksResult.page}
            pageSize={tasksResult.pageSize}
            totalPages={tasksResult.totalPages}
            sortBy={sortBy}
            sortOrder={sortOrder}
            statuses={statuses}
            divisions={divisions}
            users={users}
            currentFilters={{
              status: statusId,
              division: divisionId,
              user: assignedUserId,
              search,
            }}
            defaultStatusId={defaultStatusId}
            customFields={customFields}
            templates={templates}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
