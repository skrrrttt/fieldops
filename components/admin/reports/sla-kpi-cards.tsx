'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { SLAMetrics } from '@/lib/reports/actions';

interface SLAKPICardsProps {
  slaMetrics: SLAMetrics;
}

function TrendIndicator({
  current,
  previous,
  invertColors = false,
}: {
  current: number;
  previous: number;
  invertColors?: boolean;
}) {
  const diff = current - previous;
  if (diff === 0 && previous === 0) return null;

  const isUp = diff > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;

  // For most metrics, up is good. For avgDays/overdue, up is bad (inverted).
  const isPositive = invertColors ? !isUp : isUp;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 1 })}
    </span>
  );
}

export function SLAKPICards({ slaMetrics }: SLAKPICardsProps) {
  const onTimeColor =
    slaMetrics.onTimeRate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : slaMetrics.onTimeRate >= 60
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-red-500 dark:text-red-400';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* On-Time Rate */}
      <Card>
        <CardContent className="pt-0">
          <p className="text-sm font-medium text-muted-foreground">
            On-Time Rate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-bold tabular-nums ${onTimeColor}`}>
              {slaMetrics.onTimeRate}%
            </span>
            <TrendIndicator
              current={slaMetrics.onTimeRate}
              previous={slaMetrics.previousPeriod.onTimeRate}
            />
          </div>
        </CardContent>
      </Card>

      {/* Avg Completion Time */}
      <Card>
        <CardContent className="pt-0">
          <p className="text-sm font-medium text-muted-foreground">
            Avg Completion Time
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {slaMetrics.avgDays}
            </span>
            <span className="text-sm text-muted-foreground">days</span>
            <TrendIndicator
              current={slaMetrics.avgDays}
              previous={slaMetrics.previousPeriod.avgDays}
              invertColors
            />
          </div>
        </CardContent>
      </Card>

      {/* Overdue Tasks */}
      <Card>
        <CardContent className="pt-0">
          <p className="text-sm font-medium text-muted-foreground">
            Overdue Tasks
          </p>
          <div className="mt-2">
            <span
              className={`text-3xl font-bold tabular-nums ${
                slaMetrics.overdueCount > 0 ? 'text-destructive' : ''
              }`}
            >
              {slaMetrics.overdueCount}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Completed This Period */}
      <Card>
        <CardContent className="pt-0">
          <p className="text-sm font-medium text-muted-foreground">
            Completed This Period
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {slaMetrics.completedCount}
            </span>
            <TrendIndicator
              current={slaMetrics.completedCount}
              previous={slaMetrics.previousPeriod.completedCount}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
