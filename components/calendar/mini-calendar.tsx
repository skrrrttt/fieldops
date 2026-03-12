'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getCalendarDayCounts, type CalendarDayCounts } from '@/lib/calendar/actions';
import { getMonthGridDays, isToday, toDateStr } from './calendar-helpers';

const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MiniCalendarProps {
  basePath: string; // '/admin/calendar' or '/calendar'
}

export function MiniCalendar({ basePath }: MiniCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [counts, setCounts] = useState<CalendarDayCounts>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = getMonthGridDays(year, month);

  // Fetch counts when month changes
  useEffect(() => {
    const start = toDateStr(days[0]);
    const end = toDateStr(days[41]);
    getCalendarDayCounts(start, end).then(setCounts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-secondary transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 rounded-md hover:bg-secondary transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((name, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold text-muted-foreground uppercase"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const dateStr = toDateStr(day);
          const isCurrentMonth = day.getMonth() === month;
          const today = isToday(day);
          const count = counts[dateStr] || 0;

          return (
            <Link
              key={i}
              href={`${basePath}?view=day&date=${dateStr}`}
              className={`
                relative w-full aspect-square flex items-center justify-center rounded-md text-xs transition-colors
                ${!isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground'}
                ${today ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-secondary'}
              `}
            >
              {day.getDate()}
              {/* Task density indicator */}
              {count > 0 && isCurrentMonth && !today && (
                <span
                  className={`
                    absolute bottom-0.5 w-1 h-1 rounded-full
                    ${count >= 3 ? 'bg-primary' : 'bg-primary/50'}
                  `}
                />
              )}
              {count > 0 && today && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary-foreground" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
