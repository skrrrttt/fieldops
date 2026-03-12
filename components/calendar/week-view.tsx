'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendarTask } from '@/lib/calendar/actions';
import { TaskBar } from './task-bar';
import {
  getWeekDays,
  getTasksForDay,
  isToday,
  toDateStr,
} from './calendar-helpers';
import { Plus } from 'lucide-react';

interface WeekViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  isAdmin: boolean;
  onDayClick: (date: Date) => void;
  onCreateTask: (dateStr: string) => void;
  onTaskDrop: (taskId: string, newDate: string) => void;
}

export function WeekView({
  tasks,
  currentDate,
  isAdmin,
  onDayClick,
  onCreateTask,
  onTaskDrop,
}: WeekViewProps) {
  const router = useRouter();
  const days = getWeekDays(currentDate);
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
    <div className="grid grid-cols-7 min-h-[500px]">
      {days.map((day, i) => {
        const dateStr = toDateStr(day);
        const dayTasks = getTasksForDay(tasks, day);
        const today = isToday(day);
        const isDragOver = dragOverDate === dateStr;

        return (
          <div
            key={i}
            className={`
              border-r border-border/30 last:border-r-0 flex flex-col transition-colors
              ${isDragOver ? 'bg-primary/10' : ''}
            `}
            onDragOver={(e) => handleDragOver(e, dateStr)}
            onDrop={(e) => handleDrop(e, dateStr)}
            onDragLeave={handleDragLeave}
          >
            {/* Day header */}
            <div className="p-2 sm:p-3 border-b border-border/30 text-center">
              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <button
                onClick={() => onDayClick(day)}
                className={`
                  mt-1 w-9 h-9 flex items-center justify-center rounded-full text-lg font-bold mx-auto transition-colors
                  ${today
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                  }
                `}
              >
                {day.getDate()}
              </button>
            </div>

            {/* Tasks list */}
            <div className="flex-1 p-1.5 space-y-1 overflow-y-auto">
              {dayTasks.map(task => (
                <TaskBar
                  key={task.id}
                  task={task}
                  onClick={() => router.push(`/admin/tasks?task=${task.id}`)}
                  draggable={isAdmin}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', task.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                />
              ))}

              {/* Create task button (admin only) */}
              {isAdmin && (
                <button
                  onClick={() => onCreateTask(dateStr)}
                  className="w-full flex items-center justify-center gap-1 py-2 rounded-lg text-xs text-muted-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">Add task</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
