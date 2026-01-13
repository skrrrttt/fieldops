'use client';

import { useState } from 'react';
import type { Division } from '@/lib/database.types';
import { DivisionForm } from './division-form';
import { updateDivision, deleteDivision } from '@/lib/divisions/actions';

interface DivisionListProps {
  divisions: Division[];
}

export function DivisionList({ divisions }: DivisionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async (data: { name: string; color: string; icon: string | null }) => {
    if (!editingId) return;

    setIsLoading(true);
    setError(null);

    const result = await updateDivision(editingId, data);

    setIsLoading(false);

    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.error || 'Failed to update division');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteDivision(deletingId);

    setIsLoading(false);

    if (result.success) {
      setDeletingId(null);
    } else {
      setError(result.error || 'Failed to delete division');
    }
  };

  const editingDivision = divisions.find(d => d.id === editingId);
  const deletingDivision = divisions.find(d => d.id === deletingId);

  if (divisions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No divisions yet</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Divisions help organize tasks by team or department. Use the form above to create one.
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

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {divisions.map((division) => (
          <div key={division.id} className="py-4">
            {editingId === division.id ? (
              <DivisionForm
                division={editingDivision}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-600"
                    style={{ backgroundColor: division.color }}
                  />
                  <div>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {division.name}
                    </span>
                    {division.icon && (
                      <span className="ml-2 text-sm text-zinc-500 dark:text-zinc-400">
                        ({division.icon})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(division.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(division.id)}
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
      {deletingId && deletingDivision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Division
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete <strong>{deletingDivision.name}</strong>? This action cannot be undone.
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
