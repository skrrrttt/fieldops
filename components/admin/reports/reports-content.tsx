'use client';

import type { ReportData, DateRange } from '@/lib/reports/actions';
import { DateRangePicker } from './date-range-picker';
import { ExportButton } from './export-button';
import { SLAKPICards } from './sla-kpi-cards';
import {
  CompletionTrendChart,
  StatusBreakdownChart,
  DivisionBreakdownChart,
  UserProductivityChart,
} from './charts';

interface ReportsContentProps {
  data: ReportData;
  dateRange: DateRange;
  rangePreset: string;
}

export function ReportsContent({
  data,
  dateRange,
  rangePreset,
}: ReportsContentProps) {
  return (
    <div className="animate-fade-up space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <div className="flex items-center gap-3">
          <DateRangePicker rangePreset={rangePreset} dateRange={dateRange} />
          <ExportButton dateRange={dateRange} />
        </div>
      </div>

      {/* KPI row */}
      <SLAKPICards slaMetrics={data.slaMetrics} />

      {/* Full-width completion trend */}
      <CompletionTrendChart data={data.completionTrend} />

      {/* 2-col grid: status + division breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatusBreakdownChart data={data.statusBreakdown} />
        <DivisionBreakdownChart data={data.divisionBreakdown} />
      </div>

      {/* Full-width user productivity */}
      <UserProductivityChart data={data.userProductivity} />
    </div>
  );
}
