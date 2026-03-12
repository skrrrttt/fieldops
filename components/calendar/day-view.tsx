'use client';

import { useRouter } from 'next/navigation';
import type { CalendarTask } from '@/lib/calendar/actions';
import { getTasksForDay, toDateStr } from './calendar-helpers';
import { Plus } from 'lucide-react';

interface DayViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  isAdmin: boolean;
  onCreateTask: (dateStr: string) => void;
}

export function DayView({ tasks, currentDate, isAdmin, onCreateTask }: DayViewProps) {
  const router = useRouter();
  const dayTasks = getTasksForDay(tasks, currentDate);
  const dateStr = toDateStr(currentDate);

  return (
    <div className="p-4 sm:p-6 min-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </h3>
          <p className="text-sm text-muted-foreground">
            {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => onCreateTask(dateStr)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      {/* Task list */}
      {dayTasks.length > 0 ? (
        <div className="space-y-2">
          {dayTasks.map(task => {
            const divisionColor = task.division?.color || 'var(--primary)';
            const statusColor = task.status?.color || '#888';
            const isComplete = task.status?.is_complete;

            return (
              <button
                key={task.id}
                onClick={() => router.push(`/admin/tasks?task=${task.id}`)}
                className={`
                  w-full text-left p-4 rounded-xl border transition-all duration-150
                  hover:shadow-md hover:scale-[1.01] active:scale-[0.99]
                  ${isComplete ? 'opacity-50 border-border/30' : 'border-border/50'}
                `}
                style={{
                  backgroundColor: `${divisionColor}08`,
                  borderLeftWidth: '4px',
                  borderLeftColor: divisionColor,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold text-foreground ${isComplete ? 'line-through' : ''}`}>
                      {task.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {/* Date range */}
                      <span>
                        {task.start_date.split('T')[0]}
                        {task.end_date && task.end_date !== task.start_date && (
                          <> &rarr; {task.end_date.split('T')[0]}</>
                        )}
                      </span>
                      {/* Assigned user */}
                      {task.assigned_user && (
                        <span className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                            {task.assigned_user.email.charAt(0).toUpperCase()}
                          </span>
                          {task.assigned_user.email.split('@')[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Division badge */}
                    {task.division && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${divisionColor}20`,
                          color: divisionColor,
                        }}
                      >
                        {task.division.name}
                      </span>
                    )}
                    {/* Status badge */}
                    {task.status && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${statusColor}20`,
                          color: statusColor,
                        }}
                      >
                        {task.status.name}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-muted-foreground font-medium">No tasks scheduled</p>
          {isAdmin && (
            <button
              onClick={() => onCreateTask(dateStr)}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Create a task for this day
            </button>
          )}
        </div>
      )}
    </div>
  );
}
