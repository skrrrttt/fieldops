'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth/actions';
import { getTaskCountsByStatus } from '@/lib/dashboard/actions';

export interface DateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

export interface CompletionTrendPoint {
  date: string;
  count: number;
  label: string;
}

export interface UserProductivityRow {
  email: string;
  tasksCompleted: number;
  avgDays: number;
}

export interface SLAMetrics {
  onTimeRate: number;
  avgDays: number;
  overdueCount: number;
  completedCount: number;
  previousPeriod: {
    onTimeRate: number;
    avgDays: number;
    completedCount: number;
  };
}

export interface StatusBreakdownRow {
  name: string;
  color: string;
  count: number;
  isComplete: boolean;
}

export interface DivisionBreakdownRow {
  name: string;
  color: string;
  count: number;
}

export interface ExportTask {
  title: string;
  status: string;
  division: string;
  assignee: string;
  startDate: string;
  endDate: string;
  completedAt: string;
  durationDays: string;
}

export interface ReportData {
  completionTrend: CompletionTrendPoint[];
  userProductivity: UserProductivityRow[];
  slaMetrics: SLAMetrics;
  statusBreakdown: StatusBreakdownRow[];
  divisionBreakdown: DivisionBreakdownRow[];
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 86400000;
  return Math.round(
    (new Date(to).getTime() - new Date(from).getTime()) / msPerDay
  );
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d;
}

export async function getCompletionTrend(
  range: DateRange
): Promise<CompletionTrendPoint[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_history')
    .select('completed_at')
    .gte('completed_at', `${range.from}T00:00:00`)
    .lte('completed_at', `${range.to}T23:59:59`)
    .returns<{ completed_at: string }[]>();

  if (error || !data) return [];

  const totalDays = daysBetween(range.from, range.to);
  const useWeeks = totalDays > 60;

  // Group by day or week
  const counts = new Map<string, number>();

  for (const row of data) {
    const d = new Date(row.completed_at);
    let key: string;
    if (useWeeks) {
      // Start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = formatDate(monday);
    } else {
      key = formatDate(d);
    }
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  // Fill gaps
  const result: CompletionTrendPoint[] = [];
  const step = useWeeks ? 7 : 1;
  const current = new Date(range.from);
  const end = new Date(range.to);

  if (useWeeks) {
    // Align to Monday
    const day = current.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    current.setDate(current.getDate() + diff);
  }

  while (current <= end) {
    const key = formatDate(current);
    result.push({
      date: key,
      count: counts.get(key) || 0,
      label: useWeeks
        ? `Week of ${current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    current.setDate(current.getDate() + step);
  }

  return result;
}

export async function getUserProductivity(
  range: DateRange
): Promise<UserProductivityRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('task_history')
    .select('assigned_user_email, duration_minutes')
    .gte('completed_at', `${range.from}T00:00:00`)
    .lte('completed_at', `${range.to}T23:59:59`)
    .not('assigned_user_email', 'is', null)
    .returns<{ assigned_user_email: string; duration_minutes: number | null }[]>();

  if (error || !data) return [];

  const userMap = new Map<
    string,
    { count: number; totalMinutes: number }
  >();

  for (const row of data) {
    const email = row.assigned_user_email;
    const existing = userMap.get(email) || { count: 0, totalMinutes: 0 };
    existing.count++;
    if (row.duration_minutes) {
      existing.totalMinutes += row.duration_minutes;
    }
    userMap.set(email, existing);
  }

  return Array.from(userMap.entries())
    .map(([email, stats]) => ({
      email,
      tasksCompleted: stats.count,
      avgDays: stats.count > 0
        ? Math.round((stats.totalMinutes / stats.count / 1440) * 10) / 10
        : 0,
    }))
    .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
    .slice(0, 20);
}

export async function getSLAMetrics(range: DateRange): Promise<SLAMetrics> {
  const supabase = await createClient();
  const rangeDays = daysBetween(range.from, range.to);
  const prevTo = formatDate(addDays(range.from, -1));
  const prevFrom = formatDate(addDays(prevTo, -rangeDays));

  const [currentResult, prevResult, overdueResult] = await Promise.all([
    supabase
      .from('task_history')
      .select('completed_at, end_date, duration_minutes')
      .gte('completed_at', `${range.from}T00:00:00`)
      .lte('completed_at', `${range.to}T23:59:59`)
      .returns<{ completed_at: string; end_date: string | null; duration_minutes: number | null }[]>(),
    supabase
      .from('task_history')
      .select('completed_at, end_date, duration_minutes')
      .gte('completed_at', `${prevFrom}T00:00:00`)
      .lte('completed_at', `${prevTo}T23:59:59`)
      .returns<{ completed_at: string; end_date: string | null; duration_minutes: number | null }[]>(),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .lt('end_date', formatDate(new Date()))
      .is('deleted_at', null)
      .not('status_id', 'is', null),
  ]);

  function calcMetrics(rows: { completed_at: string; end_date: string | null; duration_minutes: number | null }[]) {
    if (!rows || rows.length === 0) {
      return { onTimeRate: 0, avgDays: 0, completedCount: 0 };
    }
    const withDueDate = rows.filter((r) => r.end_date);
    const onTime = withDueDate.filter(
      (r) => r.completed_at.split('T')[0] <= r.end_date!
    );
    const totalMinutes = rows.reduce(
      (sum, r) => sum + (r.duration_minutes || 0),
      0
    );
    return {
      onTimeRate: withDueDate.length > 0
        ? Math.round((onTime.length / withDueDate.length) * 100)
        : 0,
      avgDays:
        Math.round((totalMinutes / rows.length / 1440) * 10) / 10,
      completedCount: rows.length,
    };
  }

  // Filter out overdue tasks that are in a complete status
  // We need to check statuses table for this
  const statusResult = await supabase
    .from('statuses')
    .select('id')
    .eq('is_complete', true);
  const completeStatusIds = new Set(
    (statusResult.data || []).map((s: { id: string }) => s.id)
  );

  // Re-query active overdue (not in complete status)
  const activeOverdueResult = await supabase
    .from('tasks')
    .select('status_id')
    .lt('end_date', formatDate(new Date()))
    .is('deleted_at', null)
    .returns<{ status_id: string }[]>();

  const overdueCount = (activeOverdueResult.data || []).filter(
    (t) => !completeStatusIds.has(t.status_id)
  ).length;

  const current = calcMetrics(currentResult.data || []);
  const prev = calcMetrics(prevResult.data || []);

  return {
    onTimeRate: current.onTimeRate,
    avgDays: current.avgDays,
    overdueCount,
    completedCount: current.completedCount,
    previousPeriod: prev,
  };
}

export async function getStatusBreakdown(): Promise<StatusBreakdownRow[]> {
  const counts = await getTaskCountsByStatus();
  return counts.map((c) => ({
    name: c.status_name,
    color: c.status_color,
    count: c.count,
    isComplete: c.is_complete,
  }));
}

export async function getDivisionBreakdown(): Promise<DivisionBreakdownRow[]> {
  const supabase = await createClient();

  const [divisionsResult, tasksResult] = await Promise.all([
    supabase.from('divisions').select('id, name, color'),
    supabase
      .from('tasks')
      .select('division_id')
      .is('deleted_at', null)
      .returns<{ division_id: string | null }[]>(),
  ]);

  if (!divisionsResult.data || !tasksResult.data) return [];

  const countMap = new Map<string | null, number>();
  for (const task of tasksResult.data) {
    const key = task.division_id;
    countMap.set(key, (countMap.get(key) || 0) + 1);
  }

  const result: DivisionBreakdownRow[] = divisionsResult.data.map(
    (d: { id: string; name: string; color: string }) => ({
      name: d.name,
      color: d.color,
      count: countMap.get(d.id) || 0,
    })
  );

  const unassigned = countMap.get(null) || 0;
  if (unassigned > 0) {
    result.push({ name: 'Unassigned', color: '#94a3b8', count: unassigned });
  }

  return result.sort((a, b) => b.count - a.count);
}

export async function getTasksForExport(
  range: DateRange
): Promise<ExportTask[]> {
  await requireAdmin();
  const supabase = await createClient();

  const [historyResult, activeResult] = await Promise.all([
    supabase
      .from('task_history')
      .select(
        'title, status_name, division_name, assigned_user_email, start_date, end_date, completed_at, duration_minutes'
      )
      .gte('completed_at', `${range.from}T00:00:00`)
      .lte('completed_at', `${range.to}T23:59:59`)
      .returns<{
        title: string;
        status_name: string;
        division_name: string | null;
        assigned_user_email: string | null;
        start_date: string | null;
        end_date: string | null;
        completed_at: string;
        duration_minutes: number | null;
      }[]>(),
    supabase
      .from('tasks')
      .select(
        'title, status:statuses(name), division:divisions(name), assigned_user:users(email), start_date, end_date, created_at'
      )
      .is('deleted_at', null)
      .gte('created_at', `${range.from}T00:00:00`)
      .lte('created_at', `${range.to}T23:59:59`),
  ]);

  const rows: ExportTask[] = [];

  for (const h of historyResult.data || []) {
    rows.push({
      title: h.title,
      status: h.status_name,
      division: h.division_name || '',
      assignee: h.assigned_user_email || '',
      startDate: h.start_date || '',
      endDate: h.end_date || '',
      completedAt: h.completed_at?.split('T')[0] || '',
      durationDays: h.duration_minutes
        ? String(Math.round(h.duration_minutes / 1440 * 10) / 10)
        : '',
    });
  }

  interface ActiveTaskRow {
    title: string;
    status: { name: string } | null;
    division: { name: string } | null;
    assigned_user: { email: string } | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  }

  for (const t of (activeResult.data as ActiveTaskRow[] || [])) {
    rows.push({
      title: t.title,
      status: t.status?.name || '',
      division: t.division?.name || '',
      assignee: t.assigned_user?.email || '',
      startDate: t.start_date || '',
      endDate: t.end_date || '',
      completedAt: '',
      durationDays: '',
    });
  }

  return rows;
}

export async function getReportData(range: DateRange): Promise<ReportData> {
  await requireAdmin();

  const [completionTrend, userProductivity, slaMetrics, statusBreakdown, divisionBreakdown] =
    await Promise.all([
      getCompletionTrend(range),
      getUserProductivity(range),
      getSLAMetrics(range),
      getStatusBreakdown(),
      getDivisionBreakdown(),
    ]);

  return {
    completionTrend,
    userProductivity,
    slaMetrics,
    statusBreakdown,
    divisionBreakdown,
  };
}
