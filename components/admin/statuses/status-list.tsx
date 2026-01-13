'use client';

import { useState, useRef } from 'react';
import type { Status } from '@/lib/database.types';
import { StatusForm } from './status-form';
import { updateStatus, deleteStatus, reorderStatuses } from '@/lib/statuses/actions';

interface StatusFormData {
  name: string;
  color: string;
  order: number;
  is_complete: boolean;
  is_default: boolean;
}

interface StatusListProps {
  statuses: Status[];
}

export function StatusList({ statuses: initialStatuses }: StatusListProps) {
  const [statuses, setStatuses] = useState(initialStatuses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  const handleEdit = async (data: StatusFormData) => {
    if (!editingId) return;

    setIsLoading(true);
    setError(null);

    const result = await updateStatus(editingId, data);

    setIsLoading(false);

    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.error || 'Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteStatus(deletingId);

    setIsLoading(false);

    if (result.success) {
      setDeletingId(null);
    } else {
      setError(result.error || 'Failed to delete status');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIdRef.current = id;
  };

  const handleDragEnd = async () => {
    const dragOverId = dragOverIdRef.current;

    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const draggedIndex = statuses.findIndex(s => s.id === draggedId);
      const dragOverIndex = statuses.findIndex(s => s.id === dragOverId);

      if (draggedIndex !== -1 && dragOverIndex !== -1) {
        const newStatuses = [...statuses];
        const [draggedItem] = newStatuses.splice(draggedIndex, 1);
        newStatuses.splice(dragOverIndex, 0, draggedItem);

        // Update local state immediately for optimistic UI
        setStatuses(newStatuses);

        // Save new order to server
        const orderedIds = newStatuses.map(s => s.id);
        const result = await reorderStatuses(orderedIds);

        if (!result.success) {
          setError(result.error || 'Failed to reorder statuses');
          // Revert on error
          setStatuses(statuses);
        }
      }
    }

    setDraggedId(null);
    dragOverIdRef.current = null;
  };

  const editingStatus = statuses.find(s => s.id === editingId);
  const deletingStatus = statuses.find(s => s.id === deletingId);

  if (statuses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No statuses yet</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Create statuses to track task progress. Use the form above to add your first status.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Drag and drop to reorder statuses.
      </p>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {statuses.map((status) => (
          <div
            key={status.id}
            className={`py-4 ${draggedId === status.id ? 'opacity-50' : ''}`}
            draggable={editingId !== status.id}
            onDragStart={(e) => handleDragStart(e, status.id)}
            onDragOver={(e) => handleDragOver(e, status.id)}
            onDragEnd={handleDragEnd}
          >
            {editingId === status.id ? (
              <StatusForm
                status={editingStatus}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="cursor-grab text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  {/* Color badge */}
                  <div
                    className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-600"
                    style={{ backgroundColor: status.color }}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {status.name}
                      </span>
                      {status.is_default && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          Default
                        </span>
                      )}
                      {status.is_complete && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Done
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Order: {status.order}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(status.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(status.id)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && deletingStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Status
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete <strong>{deletingStatus.name}</strong>?
              {deletingStatus.is_default && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  Warning: This is the default status for new tasks.
                </span>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isLoading}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
