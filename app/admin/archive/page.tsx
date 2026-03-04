import { getTaskHistory, getHistoryDivisions } from '@/lib/task-history/actions';
import { TaskHistoryList } from '@/components/admin/archive/task-history-list';

export default async function AdminArchivePage() {
  const [historyResult, divisionsResult] = await Promise.all([
    getTaskHistory({ pageSize: 500, sortBy: 'completed_at', sortOrder: 'desc' }),
    getHistoryDivisions(),
  ]);

  const history = historyResult.success ? historyResult.data?.data || [] : [];
  const divisions = divisionsResult.success ? divisionsResult.data || [] : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Job Archive
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage completed jobs. Restore tasks to reopen them or delete records permanently.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-foreground">
            {history.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Archived</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-foreground">
            {history.filter(h => {
              const completed = new Date(h.completed_at);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return completed >= weekAgo;
            }).length}
          </div>
          <div className="text-sm text-muted-foreground">This Week</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-foreground">
            {history.filter(h => {
              const completed = new Date(h.completed_at);
              const monthAgo = new Date();
              monthAgo.setMonth(monthAgo.getMonth() - 1);
              return completed >= monthAgo;
            }).length}
          </div>
          <div className="text-sm text-muted-foreground">This Month</div>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="text-2xl font-bold text-foreground">
            {divisions.length}
          </div>
          <div className="text-sm text-muted-foreground">Divisions</div>
        </div>
      </div>

      {/* Archive List */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <TaskHistoryList initialData={history} divisions={divisions} />
      </div>
    </div>
  );
}
