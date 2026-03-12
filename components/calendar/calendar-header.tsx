'use client';

import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  type CalendarView,
  navigatePrev,
  navigateNext,
  getHeaderLabel,
} from './calendar-helpers';

interface CalendarHeaderProps {
  view: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  showCompleted: boolean;
  onToggleCompleted: () => void;
  loading: boolean;
}

const views: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Month' },
  { key: 'week', label: 'Week' },
  { key: 'day', label: 'Day' },
];

export function CalendarHeader({
  view,
  currentDate,
  onViewChange,
  onDateChange,
  showCompleted,
  onToggleCompleted,
  loading,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDateChange(navigatePrev(view, currentDate))}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDateChange(navigateNext(view, currentDate))}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-foreground ml-1 tabular-nums">
          {getHeaderLabel(view, currentDate)}
        </h2>

        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground ml-2" />
        )}
      </div>

      {/* Right: View switcher + controls */}
      <div className="flex items-center gap-2">
        {/* Completed toggle */}
        <button
          onClick={onToggleCompleted}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${showCompleted
              ? 'bg-secondary text-foreground'
              : 'bg-secondary/50 text-muted-foreground'
            }
          `}
          title={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}
        >
          {showCompleted ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">Completed</span>
        </button>

        {/* Today button */}
        <button
          onClick={() => onDateChange(new Date())}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-secondary hover:bg-secondary/80 transition-colors"
        >
          Today
        </button>

        {/* View switcher */}
        <div className="flex rounded-xl bg-secondary p-0.5">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                ${view === v.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
