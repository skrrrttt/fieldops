'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendarTask } from '@/lib/calendar/actions';
import { TaskBar, TaskDot } from './task-bar';
import {
  getMonthGridDays,
  getTasksForDay,
  isToday,
  toDateStr,
} from './calendar-helpers';
import { Plus } from 'lucide-react';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_VISIBLE_TASKS = 3;

interface MonthViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  isAdmin: boolean;
  onDayClick: (date: Date) => void;
  onCreateTask: (dateStr: string) => void;
  onTaskDrop: (taskId: string, newDate: string) => void;
}

export function MonthView({
  tasks,
  currentDate,
  isAdmin,
  onDayClick,
  onCreateTask,
  onTaskDrop,
}: MonthViewProps) {
  const router = useRouter();
  const days = getMonthGridDays(currentDate.getFullYear(), currentDate.getMonth());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent, dateStr: string) => {
    if (!isAdmin) return;
    e.preventDefault();
    setDragOverDate(dateStr);
  }, [isAdmin]);

  const handleDrop = useCallback((e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) onTaskDrop(taskId, dateStr);
  }, [onTaskDrop]);

  const handleDragLeave = useCallback(() => {
    setDragOverDate(null);
  }, []);

  return (
    <div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {DAY_NAMES.map(name => (
          <div
            key={name}
            className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells grid */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dateStr = toDateStr(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dayTasks = getTasksForDay(tasks, day);
          const visibleTasks = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const overflowCount = dayTasks.length - MAX_VISIBLE_TASKS;
          const today = isToday(day);
          const isDragOver = dragOverDate === dateStr;

          return (
            <div
              key={i}
              className={`
                min-h-[100px] sm:min-h-[120px] border-b border-r border-border/30 p-1 sm:p-1.5 transition-colors
                ${!isCurrentMonth ? 'bg-secondary/30' : ''}
                ${isDragOver ? 'bg-primary/10' : ''}
              `}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDrop={(e) => handleDrop(e, dateStr)}
              onDragLeave={handleDragLeave}
            >
              {/* Day number header */}
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => onDayClick(day)}
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                    ${today
                      ? 'bg-primary text-primary-foreground'
                      : isCurrentMonth
                        ? 'text-foreground hover:bg-secondary'
                        : 'text-muted-foreground/50'
                    }
                  `}
                >
                  {day.getDate()}
                </button>
                {isAdmin && isCurrentMonth && (
                  <button
                    onClick={() => onCreateTask(dateStr)}
                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/50 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Create task"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Task bars (desktop) */}
              <div className="hidden sm:flex flex-col gap-0.5">
                {visibleTasks.map(task => (
                  <TaskBar
                    key={task.id}
                    task={task}
                    compact
                    onClick={() => router.push(`/admin/tasks?task=${task.id}`)}
                    draggable={isAdmin}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', task.id);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                  />
                ))}
                {overflowCount > 0 && (
                  <button
                    onClick={() => onDayClick(day)}
                    className="text-[11px] text-primary font-medium px-2 hover:underline text-left"
                  >
                    +{overflowCount} more
                  </button>
                )}
              </div>

              {/* Task dots (mobile) */}
              <div className="flex sm:hidden flex-wrap gap-0.5 px-0.5">
                {dayTasks.slice(0, 5).map(task => (
                  <TaskDot key={task.id} task={task} />
                ))}
                {dayTasks.length > 5 && (
                  <span className="text-[9px] text-muted-foreground font-medium">
                    +{dayTasks.length - 5}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
