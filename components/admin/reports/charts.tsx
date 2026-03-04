'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Label,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type {
  CompletionTrendPoint,
  StatusBreakdownRow,
  DivisionBreakdownRow,
  UserProductivityRow,
} from '@/lib/reports/actions';

// ─── Completion Trend (Line Chart) ─────────────────────────────────────────

interface CompletionTrendChartProps {
  data: CompletionTrendPoint[];
}

const completionTrendConfig: ChartConfig = {
  completed: { label: 'Completed', color: 'var(--chart-1)' },
};

export function CompletionTrendChart({ data }: CompletionTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Completion Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No completion data for this period.
          </p>
        ) : (
          <ChartContainer
            config={completionTrendConfig}
            className="aspect-auto h-[300px]"
          >
            <LineChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="count"
                type="monotone"
                stroke="var(--color-completed)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Status Breakdown (Donut / Pie Chart) ──────────────────────────────────

interface StatusBreakdownChartProps {
  data: StatusBreakdownRow[];
}

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const config = useMemo<ChartConfig>(() => {
    const c: ChartConfig = {};
    for (const item of data) {
      c[item.name] = { label: item.name, color: item.color };
    }
    return c;
  }, [data]);

  const total = useMemo(
    () => data.reduce((sum, row) => sum + row.count, 0),
    [data]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No status data available.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[300px]"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
              <Pie
                data={data}
                dataKey="count"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl font-bold"
                          >
                            {total}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-xs"
                          >
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Division Breakdown (Horizontal Bar Chart) ─────────────────────────────

interface DivisionBreakdownChartProps {
  data: DivisionBreakdownRow[];
}

export function DivisionBreakdownChart({ data }: DivisionBreakdownChartProps) {
  const config = useMemo<ChartConfig>(() => {
    const c: ChartConfig = {};
    for (const item of data) {
      c[item.name] = { label: item.name, color: item.color };
    }
    return c;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Division Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No division data available.
          </p>
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[300px]"
          >
            <BarChart data={data} layout="vertical" accessibilityLayer>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={4}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

// ─── User Productivity (Vertical Bar Chart) ────────────────────────────────

interface UserProductivityChartProps {
  data: UserProductivityRow[];
}

const productivityConfig: ChartConfig = {
  tasksCompleted: { label: 'Tasks Completed', color: 'var(--chart-1)' },
};

export function UserProductivityChart({ data }: UserProductivityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Productivity</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No productivity data for this period.
          </p>
        ) : (
          <ChartContainer
            config={productivityConfig}
            className="aspect-auto h-[300px]"
          >
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="email"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: string) => v.split('@')[0]}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => (
                      <div className="space-y-1">
                        <p className="font-medium">
                          {item.payload.email}
                        </p>
                        <p>
                          Tasks completed:{' '}
                          <span className="font-mono font-medium tabular-nums">
                            {value}
                          </span>
                        </p>
                        <p>
                          Avg days:{' '}
                          <span className="font-mono font-medium tabular-nums">
                            {item.payload.avgDays}
                          </span>
                        </p>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="tasksCompleted"
                fill="var(--color-tasksCompleted)"
                radius={4}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
