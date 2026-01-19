'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useRef, useTransition } from 'react';
import type { TaskWithRelations } from '@/lib/tasks/actions';
import type { Status, Division, User, CustomFieldDefinition, TaskTemplate, ChecklistWithItems } from '@/lib/database.types';
import { TaskModal } from './task-modal';
import { BulkActionBar } from './bulk-action-bar';
import { getTaskChecklistIds } from '@/lib/checklists/actions';

interface TaskTableProps {
  tasks: TaskWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  statuses: Status[];
  divisions: Division[];
  users: User[];
  currentFilters: {
    status: string;
    division: string;
    user: string;
    search: string;
  };
  defaultStatusId: string | null;
  customFields: CustomFieldDefinition[];
  templates: TaskTemplate[];
  checklists: ChecklistWithItems[];
}

export function TaskTable({
  tasks,
  total,
  page,
  pageSize,
  totalPages,
  sortBy,
  sortOrder,
  statuses,
  divisions,
  users,
  currentFilters,
  defaultStatusId,
  customFields,
  templates,
  checklists,
}: TaskTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(currentFilters.search);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null);
  const [editingTaskChecklistIds, setEditingTaskChecklistIds] = useState<string[]>([]);

  // Bulk selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);

  const handleCreateClick = () => {
    setEditingTask(null);
    setEditingTaskChecklistIds([]);
    setIsModalOpen(true);
  };

  const handleEditClick = async (task: TaskWithRelations) => {
    setEditingTask(task);
    // Fetch the checklist IDs for this task
    const checklistIds = await getTaskChecklistIds(task.id);
    setEditingTaskChecklistIds(checklistIds);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setEditingTaskChecklistIds([]);
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
    } else {
      setSelectedTaskIds(new Set());
    }
    lastSelectedIndexRef.current = null;
  };

  const handleSelectTask = (taskId: string, index: number, event: React.MouseEvent | React.ChangeEvent<HTMLInputElement>) => {
    const isShiftClick = 'shiftKey' in event && event.shiftKey;

    setSelectedTaskIds(prev => {
      const newSelection = new Set(prev);

      if (isShiftClick && lastSelectedIndexRef.current !== null) {
        // Shift+click: select range
        const start = Math.min(lastSelectedIndexRef.current, index);
        const end = Math.max(lastSelectedIndexRef.current, index);
        for (let i = start; i <= end; i++) {
          newSelection.add(tasks[i].id);
        }
      } else {
        // Normal click: toggle selection
        if (newSelection.has(taskId)) {
          newSelection.delete(taskId);
        } else {
          newSelection.add(taskId);
        }
      }

      return newSelection;
    });

    lastSelectedIndexRef.current = index;
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
    lastSelectedIndexRef.current = null;
  };

  const handleBulkActionComplete = () => {
    setSelectedTaskIds(new Set());
    lastSelectedIndexRef.current = null;
    // Use startTransition for non-blocking refresh
    startTransition(() => {
      router.refresh();
    });
  };

  const isAllSelected = tasks.length > 0 && selectedTaskIds.size === tasks.length;
  const isSomeSelected = selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });
      // Reset to page 1 when filters change (except when changing page)
      if (!('page' in updates)) {
        params.delete('page');
      }
      router.push(`/admin/tasks?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSort = (column: string) => {
    const newOrder =
      sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateParams({ sortBy: column, sortOrder: newOrder });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [key]: value });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput });
  };

  const handlePageChange = (newPage: number) => {
    updateParams({ page: String(newPage) });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // CSV Export functionality
  const handleExportCSV = () => {
    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Format location for CSV
    const formatLocation = (task: TaskWithRelations): string => {
      const parts: string[] = [];
      if (task.address) parts.push(task.address);
      if (task.location_lat && task.location_lng) {
        parts.push(`(${task.location_lat}, ${task.location_lng})`);
      }
      return parts.join(' ');
    };

    // CSV headers
    const headers = ['ID', 'Title', 'Status', 'Division', 'Assigned User', 'Due Date', 'Created Date', 'Location'];

    // Build CSV rows from visible/filtered tasks
    const rows = tasks.map(task => [
      escapeCSV(task.id),
      escapeCSV(task.title),
      escapeCSV(task.status?.name),
      escapeCSV(task.division?.name),
      escapeCSV(task.assigned_user?.email),
      escapeCSV(task.due_date ? new Date(task.due_date).toLocaleDateString() : ''),
      escapeCSV(task.created_at ? new Date(task.created_at).toLocaleDateString() : ''),
      escapeCSV(formatLocation(task)),
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `tasks-export-${timestamp}.csv`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderSortIcon = (column: string) => {
    if (sortBy !== column) {
      return (
        <span className="ml-1 text-zinc-400">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </span>
      );
    }
    return (
      <span className="ml-1 text-blue-600">
        {sortOrder === 'asc' ? (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  return (
    <div>
      {/* Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={editingTask}
        statuses={statuses}
        divisions={divisions}
        users={users}
        defaultStatusId={defaultStatusId}
        customFields={customFields}
        templates={templates}
        checklists={checklists}
        initialChecklistIds={editingTaskChecklistIds}
      />

      {/* Header with Create Button and Export */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-4">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {selectedTaskIds.size > 0 ? (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {selectedTaskIds.size} selected
            </span>
          ) : (
            <span>{total} {total === 1 ? 'task' : 'tasks'} total</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={tasks.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export to CSV
          </button>
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Task
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-10 pl-10 pr-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={currentFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          {/* Division Filter */}
          <select
            value={currentFilters.division}
            onChange={(e) => handleFilterChange('division', e.target.value)}
            className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All Divisions</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </select>

          {/* User Filter */}
          <select
            value={currentFilters.user}
            onChange={(e) => handleFilterChange('user', e.target.value)}
            className="h-10 px-4 border border-zinc-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(currentFilters.status ||
            currentFilters.division ||
            currentFilters.user ||
            currentFilters.search) && (
            <button
              onClick={() => router.push('/admin/tasks')}
              className="h-10 px-4 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedTaskIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTaskIds.size}
          selectedIds={Array.from(selectedTaskIds)}
          statuses={statuses}
          users={users}
          onClearSelection={handleClearSelection}
          onActionComplete={handleBulkActionComplete}
        />
      )}

      {/* Mobile Card View */}
      <div className="md:hidden">
        {tasks.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-2">No tasks found</p>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">Try adjusting your filters or create a new task</p>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Task
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`bg-white dark:bg-zinc-800 rounded-xl border shadow-sm transition-all ${
                  selectedTaskIds.has(task.id)
                    ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={(e) => handleSelectTask(task.id, index, e)}
                      className="mt-0.5 w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-zinc-900 dark:text-white leading-snug">
                          {task.title}
                        </h3>
                        {task.status && (
                          <span
                            className="flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${task.status.color}15`,
                              color: task.status.color,
                              border: `1px solid ${task.status.color}30`,
                            }}
                          >
                            {task.status.name}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-3">
                          {task.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {task.division && (
                          <span
                            className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                            style={{
                              backgroundColor: `${task.division.color}15`,
                              color: task.division.color,
                            }}
                          >
                            {task.division.icon && (
                              <span className="mr-1">{task.division.icon}</span>
                            )}
                            {task.division.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(task.due_date)}
                          </span>
                        )}
                        {task.assigned_user && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {task.assigned_user.email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-700/50 bg-zinc-50/50 dark:bg-zinc-800/50 rounded-b-xl">
                  <button
                    onClick={() => handleEditClick(task)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    View & Edit Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-700">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-600"
                onClick={() => handleSort('title')}
              >
                Title
                {renderSortIcon('title')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Division
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Assigned To
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-600"
                onClick={() => handleSort('due_date')}
              >
                Due Date
                {renderSortIcon('due_date')}
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-600"
                onClick={() => handleSort('created_at')}
              >
                Created
                {renderSortIcon('created_at')}
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-2">No tasks found</p>
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 mb-4">Try adjusting your filters or create a new task</p>
                    <button
                      onClick={handleCreateClick}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Task
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task, index) => (
                <tr
                  key={task.id}
                  className={`hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${
                    selectedTaskIds.has(task.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTaskIds.has(task.id)}
                      onChange={(e) => handleSelectTask(task.id, index, e)}
                      onClick={(e) => {
                        if (e.shiftKey) {
                          e.preventDefault();
                          handleSelectTask(task.id, index, e);
                        }
                      }}
                      className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-xs">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.status ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${task.status.color}20`,
                          color: task.status.color,
                        }}
                      >
                        {task.status.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.division ? (
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${task.division.color}20`,
                          color: task.division.color,
                        }}
                      >
                        {task.division.icon && (
                          <span className="mr-1">{task.division.icon}</span>
                        )}
                        {task.division.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {task.assigned_user?.email || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(task.due_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(task.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEditClick(task)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing {tasks.length > 0 ? (page - 1) * pageSize + 1 : 0} to{' '}
          {Math.min(page * pageSize, total)} of {total} tasks
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
          >
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 text-sm rounded-lg ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
