import { requireAdmin } from '@/lib/auth/actions';
import { getTaskHistory, getHistoryDivisions } from '@/lib/task-history/actions';
import { TaskHistoryList } from '@/components/admin/archive/task-history-list';
import { AdminLayout } from '@/components/admin/admin-layout';

export default async function AdminArchivePage() {
  const user = await requireAdmin();

  const [historyResult, divisionsResult] = await Promise.all([
    getTaskHistory({ pageSize: 500, sortBy: 'completed_at', sortOrder: 'desc' }),
    getHistoryDivisions(),
  ]);

  const history = historyResult.success ? historyResult.data?.data || [] : [];
  const divisions = divisionsResult.success ? divisionsResult.data || [] : [];

  return (
    <AdminLayout user={user}>
      <div className="max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Job Archive
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            View and manage completed jobs. Restore tasks to reopen them or delete records permanently.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {history.length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Total Archived</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {history.filter(h => {
                const completed = new Date(h.completed_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return completed >= weekAgo;
              }).length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">This Week</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {history.filter(h => {
                const completed = new Date(h.completed_at);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return completed >= monthAgo;
              }).length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">This Month</div>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">
              {divisions.length}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Divisions</div>
          </div>
        </div>

        {/* Archive List */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6">
          <TaskHistoryList initialData={history} divisions={divisions} />
        </div>
      </div>
    </AdminLayout>
  );
}
