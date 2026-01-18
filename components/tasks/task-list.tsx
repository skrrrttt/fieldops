'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskWithRelations } from '@/lib/tasks/actions';
import type { Status, Division } from '@/lib/database.types';
import { TaskCard } from './task-card';

interface TaskListProps {
  tasks: TaskWithRelations[];
  statuses: Status[];
  divisions: Division[];
}

type StatusFilter = 'all' | 'todo' | 'in_progress' | 'complete';

export function TaskList({ tasks, statuses, divisions }: TaskListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');

  // Categorize statuses for filter buttons
  const todoStatuses = useMemo(
    () => statuses.filter((s) => !s.is_complete && s.order === 0),
    [statuses]
  );
  const inProgressStatuses = useMemo(
    () => statuses.filter((s) => !s.is_complete && s.order > 0),
    [statuses]
  );
  const completeStatuses = useMemo(
    () => statuses.filter((s) => s.is_complete),
    [statuses]
  );

  // Filter tasks based on selected filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply status filter
    if (statusFilter === 'todo') {
      const todoIds = new Set(todoStatuses.map((s) => s.id));
      // Also include statuses that are marked as default (typically "New" or "To Do")
      statuses.forEach((s) => {
        if (s.is_default) todoIds.add(s.id);
      });
      filtered = filtered.filter((task) => todoIds.has(task.status_id));
    } else if (statusFilter === 'in_progress') {
      const inProgressIds = new Set(inProgressStatuses.map((s) => s.id));
      filtered = filtered.filter((task) => inProgressIds.has(task.status_id));
    } else if (statusFilter === 'complete') {
      const completeIds = new Set(completeStatuses.map((s) => s.id));
      filtered = filtered.filter((task) => completeIds.has(task.status_id));
    }

    // Apply division filter
    if (divisionFilter !== 'all') {
      filtered = filtered.filter((task) => task.division_id === divisionFilter);
    }

    return filtered;
  }, [tasks, statusFilter, divisionFilter, todoStatuses, inProgressStatuses, completeStatuses, statuses]);

  const handleTaskClick = (taskId: string) => {
    router.push(`/tasks/${taskId}`);
  };

  const statusFilterButtons: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'complete', label: 'Complete' },
  ];

  return (
    <div className="space-y-4">
      {/* Status Filter - Horizontal Scrollable Tabs */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {statusFilterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setStatusFilter(btn.key)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                statusFilter === btn.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 active:bg-zinc-50 dark:active:bg-zinc-700'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Division Filter & Task Count Row */}
      <div className="flex items-center justify-between gap-3">
        <select
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Divisions</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.icon ? `${division.icon} ` : ''}{division.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task Cards */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 mb-4">
            <svg
              className="w-8 h-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">No tasks found</p>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm mt-1">
            Try adjusting your filters
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => handleTaskClick(task.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
