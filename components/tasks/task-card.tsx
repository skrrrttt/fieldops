'use client';

import { memo } from 'react';
import type { TaskWithRelations } from '@/lib/tasks/actions';
// ProStreet brand constant
const PRIMARY_COLOR = '#f97316';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Calendar, ChevronRight, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  task: TaskWithRelations;
  onClick?: () => void;
}

// Extracted outside component to avoid recreation on each render
function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const TaskCard = memo(function TaskCard({ task, onClick }: TaskCardProps) {

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.status?.is_complete;
  const isComplete = task.status?.is_complete;

  return (
    <div
      onClick={onClick}
      className={`
        group relative bg-card rounded-xl border overflow-hidden cursor-pointer
        transition-all duration-200 ease-out
        hover:shadow-lg hover:-translate-y-0.5
        active:scale-[0.99] active:shadow-md
        ${isOverdue
          ? 'border-destructive/40 bg-destructive/5 dark:bg-destructive/10'
          : isComplete
            ? 'border-success/40 bg-success/5 dark:bg-success/10'
            : 'border-border/50 dark:border-border/30 hover:border-primary/30'
        }
      `}
    >
      {/* Priority indicator stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-200 group-hover:w-1.5"
        style={{
          backgroundColor: isOverdue
            ? 'var(--destructive)'
            : task.status?.color || PRIMARY_COLOR
        }}
      />

      <div className="p-4 pl-5">
        {/* Header: Status badge and chevron */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-base font-bold leading-tight text-foreground mb-1.5 pr-2">
              {task.title}
            </h3>

            {/* Status Badge */}
            {task.status && (
              <Badge
                variant="outline"
                size="sm"
                className="font-semibold"
                style={{
                  backgroundColor: `${task.status.color}15`,
                  color: task.status.color,
                  borderColor: `${task.status.color}30`,
                }}
              >
                {task.status.name}
              </Badge>
            )}
          </div>

          {/* Chevron indicator */}
          <ChevronRight
            className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5"
          />
        </div>

        {/* Division Badge */}
        {task.division && (
          <div className="mb-3">
            <Badge
              variant="secondary"
              size="sm"
              className="font-medium"
              style={{
                backgroundColor: `${task.division.color}12`,
                color: task.division.color,
              }}
            >
              {task.division.icon && <span className="mr-0.5">{task.division.icon}</span>}
              {task.division.name}
            </Badge>
          </div>
        )}

        {/* Location */}
        {task.address && (
          <div className="flex items-center text-sm text-muted-foreground mb-3">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-primary/60" />
            <span className="truncate">{task.address}</span>
          </div>
        )}

        {/* Footer: Due date and Assigned user */}
        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          {/* Due Date */}
          <div className="flex items-center gap-2">
            {task.due_date && (
              <span
                className={`flex items-center text-sm font-medium ${
                  isOverdue
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}
              >
                {isOverdue ? (
                  <AlertCircle className="w-4 h-4 mr-1.5" />
                ) : (
                  <Calendar className="w-4 h-4 mr-1.5" />
                )}
                {formatDate(task.due_date)}
                {isOverdue && <span className="ml-1 text-xs font-bold uppercase tracking-wide">Overdue</span>}
              </span>
            )}
          </div>

          {/* Assigned User */}
          {task.assigned_user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 ring-2 ring-background shadow-sm">
                <AvatarFallback
                  className="text-xs font-bold"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY_COLOR}20, ${PRIMARY_COLOR}40)`,
                    color: PRIMARY_COLOR,
                  }}
                >
                  {task.assigned_user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-muted-foreground truncate max-w-[100px]">
                {task.assigned_user.email.split('@')[0]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
