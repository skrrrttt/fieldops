'use client';

import { useState } from 'react';
import type { TaskHistory } from '@/lib/database.types';
import { deleteTaskHistory, restoreTaskFromHistory } from '@/lib/task-history/actions';

interface TaskHistoryListProps {
  initialData: TaskHistory[];
  divisions: string[];
}

export function TaskHistoryList({ initialData, divisions }: TaskHistoryListProps) {
  const [history, setHistory] = useState(initialData);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Client-side filtering
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase()) ||
      item.assigned_user_email?.toLowerCase().includes(search.toLowerCase());

    const matchesDivision = !divisionFilter || item.division_name === divisionFilter;

    const completedDate = new Date(item.completed_at);
    const matchesDateFrom = !dateFrom || completedDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || completedDate <= new Date(dateTo + 'T23:59:59');

    return matchesSearch && matchesDivision && matchesDateFrom && matchesDateTo;
  });

  const handleRestore = async (id: string) => {
    setIsLoading(true);
    setError(null);

    const result = await restoreTaskFromHistory(id);

    setIsLoading(false);

    if (result.success) {
      setSuccess('Task restored successfully! It has been added back to the task list.');
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(result.error || 'Failed to restore task');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteTaskHistory(deleteId);

    setIsLoading(false);

    if (result.success) {
      setHistory((prev) => prev.filter((h) => h.id !== deleteId));
      setDeleteId(null);
      setSuccess('Record deleted permanently.');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to delete record');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return `${hours}h ${mins}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  const deletingItem = history.find((h) => h.id === deleteId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, description, user..."
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Division Filter */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Division
            </label>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Divisions</option>
              {divisions.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Active Filters & Clear */}
        {(search || divisionFilter || dateFrom || dateTo) && (
          <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing {filteredHistory.length} of {history.length} records
            </span>
            <button
              onClick={() => {
                setSearch('');
                setDivisionFilter('');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
            <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
            {history.length === 0 ? 'No completed tasks yet' : 'No matching records'}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            {history.length === 0
              ? 'When tasks are marked as complete, they will appear here for archival.'
              : 'Try adjusting your filters to find what you\'re looking for.'}
          </p>
        </div>
      ) : (
        /* History List */
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Main Row */}
              <div
                className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-750"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.status_color || '#10B981' }}
                      />
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                        {item.title}
                      </h3>
                      {item.division_name && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: `${item.division_color}20`,
                            color: item.division_color || '#6B7280',
                          }}
                        >
                          {item.division_name}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>Completed: {formatDate(item.completed_at)}</span>
                      {item.assigned_user_email && (
                        <span>By: {item.assigned_user_email}</span>
                      )}
                      <span>Duration: {formatDuration(item.duration_minutes)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(item.id);
                      }}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md disabled:opacity-50"
                    >
                      Restore
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      disabled={isLoading}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <svg
                      className={`w-5 h-5 text-zinc-400 transition-transform ${expandedId === item.id ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === item.id && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {item.description && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Description:</span>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      </div>
                    )}
                    {item.address && (
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">Address:</span>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{item.address}</p>
                      </div>
                    )}
                    {(item.start_date || item.end_date) && (
                      <div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {item.start_date && item.end_date ? 'Date Range:' : item.start_date ? 'Start Date:' : 'End Date:'}
                        </span>
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                          {item.start_date && item.end_date
                            ? `${formatDate(item.start_date)} - ${formatDate(item.end_date)}`
                            : formatDate((item.start_date || item.end_date)!)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Created:</span>
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {formatDate(item.task_created_at)}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">Attachments:</span>
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {item.photos_count} photos, {item.comments_count} comments, {item.files_count} files
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Record Permanently
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to permanently delete <strong>{deletingItem.title}</strong> from the archive? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                disabled={isLoading}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
