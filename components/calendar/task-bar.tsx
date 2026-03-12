'use client';

import type { CalendarTask } from '@/lib/calendar/actions';

interface TaskBarProps {
  task: CalendarTask;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function TaskBar({ task, compact, onClick, draggable, onDragStart }: TaskBarProps) {
  const divisionColor = task.division?.color || 'var(--primary)';
  const statusColor = task.status?.color || '#888';
  const isComplete = task.status?.is_complete;

  return (
    <button
      type="button"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      className={`
        w-full text-left rounded-md px-2 transition-all duration-150 group
        hover:shadow-md hover:scale-[1.02] active:scale-[0.98]
        ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${isComplete ? 'opacity-50' : ''}
        ${compact ? 'py-0.5 text-[11px]' : 'py-1 text-xs'}
      `}
      style={{
        backgroundColor: `${divisionColor}18`,
        borderLeft: `3px solid ${divisionColor}`,
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Status dot */}
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        {/* Title */}
        <span
          className={`truncate font-medium ${isComplete ? 'line-through text-muted-foreground' : 'text-foreground'}`}
        >
          {task.title}
        </span>
      </div>
    </button>
  );
}

interface TaskDotProps {
  task: CalendarTask;
}

/** Compact dot for mobile month view */
export function TaskDot({ task }: TaskDotProps) {
  const color = task.division?.color || 'var(--primary)';
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={task.title}
    />
  );
}
