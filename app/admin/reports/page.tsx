import { getReportData } from '@/lib/reports/actions';
import { ReportsContent } from '@/components/admin/reports/reports-content';
import type { DateRange } from '@/lib/reports/actions';

function parseDateRange(searchParams: Record<string, string | string[] | undefined>): {
  range: DateRange;
  preset: string;
} {
  const rangeParam = typeof searchParams.range === 'string' ? searchParams.range : '30';
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (rangeParam === 'custom') {
    const from = typeof searchParams.from === 'string' ? searchParams.from : today;
    const to = typeof searchParams.to === 'string' ? searchParams.to : today;
    return { range: { from, to }, preset: 'custom' };
  }

  const days = parseInt(rangeParam, 10) || 30;
  const fromDate = new Date(now);
  fromDate.setDate(fromDate.getDate() - days);
  return {
    range: { from: fromDate.toISOString().split('T')[0], to: today },
    preset: String(days),
  };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { range, preset } = parseDateRange(params);
  const data = await getReportData(range);

  return <ReportsContent data={data} dateRange={range} rangePreset={preset} />;
}
