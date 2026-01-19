'use client';

/**
 * Conflict Resolution UI Component
 * Shows conflicts between local changes and server changes
 * Allows user to choose which version to keep
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getConflictingMutations,
  resolveConflict,
  type TypedPendingMutation,
} from '@/lib/offline';
import { getFromLocal, type LocalTask } from '@/lib/offline';
import { getAllFromLocal } from '@/lib/offline/helpers';
import type { Status } from '@/lib/database.types';

interface ConflictResolutionProps {
  onResolved?: () => void;
}

export function ConflictResolution({ onResolved }: ConflictResolutionProps) {
  const [conflicts, setConflicts] = useState<TypedPendingMutation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  const loadConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const conflictingMutations = await getConflictingMutations();
      setConflicts(conflictingMutations);
    } catch {
      // Conflicts failed to load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConflicts();
  }, [loadConflicts]);

  const handleResolve = async (mutationId: string, resolution: 'local' | 'server') => {
    setResolving(mutationId);
    try {
      await resolveConflict(mutationId, resolution);
      // Reload conflicts
      await loadConflicts();
      onResolved?.();
    } catch {
      // Conflict resolution failed
    } finally {
      setResolving(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading conflicts...
      </div>
    );
  }

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="font-semibold text-amber-800">
          {conflicts.length} Sync Conflict{conflicts.length !== 1 ? 's' : ''}
        </h3>
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Your changes conflict with updates made on the server. Please choose which version to keep.
      </p>
      <div className="space-y-3">
        {conflicts.map((mutation) => (
          <ConflictItem
            key={mutation.id}
            mutation={mutation}
            onResolve={handleResolve}
            isResolving={resolving === mutation.id}
          />
        ))}
      </div>
    </div>
  );
}

interface ConflictItemProps {
  mutation: TypedPendingMutation;
  onResolve: (mutationId: string, resolution: 'local' | 'server') => void;
  isResolving: boolean;
}

function ConflictItem({ mutation, onResolve, isResolving }: ConflictItemProps) {
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [localStatusName, setLocalStatusName] = useState<string>('');
  const [serverStatusName, setServerStatusName] = useState<string>('');

  useEffect(() => {
    async function loadDetails() {
      if (mutation.type === 'status' && mutation.conflict) {
        const task = await getFromLocal('tasks', mutation.payload.task_id);
        if (task) {
          setTaskTitle((task as LocalTask).title);
        }

        // Get status names
        const statuses = await getAllFromLocal('statuses');
        const localStatus = statuses.find((s: Status) => s.id === mutation.conflict?.local_value);
        const serverStatus = statuses.find((s: Status) => s.id === mutation.conflict?.server_value);

        if (localStatus) setLocalStatusName(localStatus.name);
        if (serverStatus) setServerStatusName(serverStatus.name);
      }
    }
    loadDetails();
  }, [mutation]);

  if (!mutation.conflict) return null;

  const conflict = mutation.conflict;

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4">
      <div className="mb-3">
        <div className="text-sm text-gray-600 mb-1">
          {mutation.type === 'status' ? 'Status Change' : mutation.type} conflict on:
        </div>
        <div className="font-medium text-gray-900">
          {taskTitle || 'Loading...'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="text-xs font-medium text-blue-600 uppercase mb-1">
            Your Change
          </div>
          <div className="text-sm font-medium text-blue-900">
            {mutation.type === 'status' ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {localStatusName || 'Loading...'}
              </span>
            ) : (
              String(conflict.local_value)
            )}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Changed {formatRelativeTime(mutation.created_at)}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-xs font-medium text-green-600 uppercase mb-1">
            Server Version
          </div>
          <div className="text-sm font-medium text-green-900">
            {mutation.type === 'status' ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {serverStatusName || 'Loading...'}
              </span>
            ) : (
              String(conflict.server_value)
            )}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Updated {formatRelativeTime(conflict.server_updated_at)}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onResolve(mutation.id, 'local')}
          disabled={isResolving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {isResolving ? 'Resolving...' : 'Keep My Change'}
        </button>
        <button
          onClick={() => onResolve(mutation.id, 'server')}
          disabled={isResolving}
          className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {isResolving ? 'Resolving...' : 'Use Server Version'}
        </button>
      </div>
    </div>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Compact conflict indicator for headers/navbars
 */
export function ConflictIndicator({ onClick }: { onClick?: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function checkConflicts() {
      const conflicts = await getConflictingMutations();
      setCount(conflicts.length);
    }

    checkConflicts();
    const interval = setInterval(checkConflicts, 5000);
    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full hover:bg-amber-200 transition-colors"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      {count} conflict{count !== 1 ? 's' : ''}
    </button>
  );
}

/**
 * Modal wrapper for conflict resolution
 */
interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConflictModal({ isOpen, onClose }: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Resolve Sync Conflicts
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <ConflictResolution onResolved={() => {}} />
        </div>
      </div>
    </div>
  );
}
