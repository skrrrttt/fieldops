'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import type { DateRange } from '@/lib/reports/actions';

interface DateRangePickerProps {
  rangePreset: string;
  dateRange: DateRange;
}

const presets = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
] as const;

export function DateRangePicker({
  rangePreset,
  dateRange,
}: DateRangePickerProps) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(dateRange.from);
  const [customTo, setCustomTo] = useState(dateRange.to);
  const [open, setOpen] = useState(false);

  function handlePresetClick(value: string) {
    router.push(`/admin/reports?range=${value}`);
  }

  function handleCustomApply() {
    if (customFrom && customTo) {
      router.push(
        `/admin/reports?range=custom&from=${customFrom}&to=${customTo}`
      );
      setOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {presets.map((preset) => (
        <button
          key={preset.value}
          onClick={() => handlePresetClick(preset.value)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            rangePreset === preset.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {preset.label}
        </button>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              rangePreset === 'custom'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <CalendarDays className="h-3 w-3" />
            Custom
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto space-y-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              From
            </label>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">
              To
            </label>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleCustomApply}>
            Apply
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
