'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { getTasksForExport } from '@/lib/reports/actions';
import type { DateRange, ExportTask } from '@/lib/reports/actions';

interface ExportButtonProps {
  dateRange: DateRange;
}

function buildCSV(rows: ExportTask[]): string {
  const headers = [
    'Title',
    'Status',
    'Division',
    'Assignee',
    'Start Date',
    'End Date',
    'Completed At',
    'Duration (Days)',
  ];

  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        escape(r.title),
        escape(r.status),
        escape(r.division),
        escape(r.assignee),
        r.startDate,
        r.endDate,
        r.completedAt,
        r.durationDays,
      ].join(',')
    ),
  ];

  return lines.join('\n');
}

export function ExportButton({ dateRange }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const tasks = await getTasksForExport(dateRange);
      const csv = buildCSV(tasks);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tasks-${dateRange.from}-to-${dateRange.to}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          data-print-hide
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportCSV} disabled={exporting}>
          <FileSpreadsheet className="h-4 w-4" />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          Print / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
