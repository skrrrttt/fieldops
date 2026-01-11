'use client';

import { useState } from 'react';
import type { Status, User } from '@/lib/database.types';
import { bulkAssignTasks, bulkChangeStatus, bulkDeleteTasks } from '@/lib/tasks/actions';

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  statuses: Status[];
  users: User[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

type BulkAction = 'assign' | 'status' | 'delete' | null;

export function BulkActionBar({
  selectedCount,
  selectedIds,
  statuses,
  users,
  onClearSelection,
  onActionComplete,
}: BulkActionBarProps) {
  const [activeAction, setActiveAction] = useState<BulkAction>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedStatusId, setSelectedStatusId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedUserId && selectedUserId !== '__unassign__') return;

    setIsProcessing(true);
    setError(null);

    try {
      const userId = selectedUserId === '__unassign__' ? null : selectedUserId;
      const result = await bulkAssignTasks(selectedIds, userId);

      if (!result.success) {
        setError(result.error || 'Failed to assign tasks');
        return;
      }

      setActiveAction(null);
      setSelectedUserId('');
      onActionComplete();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!selectedStatusId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const result = await bulkChangeStatus(selectedIds, selectedStatusId);

      if (!result.success) {
        setError(result.error || 'Failed to change task status');
        return;
      }

      setActiveAction(null);
      setSelectedStatusId('');
      onActionComplete();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await bulkDeleteTasks(selectedIds);

      if (!result.success) {
        setError(result.error || 'Failed to delete tasks');
        return;
      }

      setShowDeleteConfirm(false);
      setActiveAction(null);
      onActionComplete();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setActiveAction(null);
    setShowDeleteConfirm(false);
    setSelectedUserId('');
    setSelectedStatusId('');
    setError(null);
  };

  return (
    <div className="sticky top-0 z-10 bg-blue-600 text-white px-4 py-3 flex items-center gap-4 shadow-md">
      {/* Selection Count */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{selectedCount} selected</span>
        <button
          onClick={onClearSelection}
          className="text-blue-200 hover:text-white text-sm underline"
        >
          Clear
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-blue-400" />

      {/* Action Buttons or Active Action UI */}
      {!activeAction && !showDeleteConfirm && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveAction('assign')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Assign to User
          </button>
          <button
            onClick={() => setActiveAction('status')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-400 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Change Status
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-400 rounded-lg text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Assign to User UI */}
      {activeAction === 'assign' && (
        <div className="flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="px-3 py-1.5 border border-blue-400 rounded-lg bg-blue-700 text-white text-sm focus:ring-2 focus:ring-white focus:border-transparent"
          >
            <option value="">Select user...</option>
            <option value="__unassign__">Unassign</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || isProcessing}
            className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Assigning...' : 'Apply'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3 py-1.5 text-blue-200 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Change Status UI */}
      {activeAction === 'status' && (
        <div className="flex items-center gap-2">
          <select
            value={selectedStatusId}
            onChange={(e) => setSelectedStatusId(e.target.value)}
            className="px-3 py-1.5 border border-blue-400 rounded-lg bg-blue-700 text-white text-sm focus:ring-2 focus:ring-white focus:border-transparent"
          >
            <option value="">Select status...</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleChangeStatus}
            disabled={!selectedStatusId || isProcessing}
            className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Updating...' : 'Apply'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3 py-1.5 text-blue-200 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="flex items-center gap-3">
          <span className="text-sm">
            Are you sure you want to delete {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'}?
          </span>
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-red-500 hover:bg-red-400 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Deleting...' : 'Yes, Delete'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="px-3 py-1.5 text-blue-200 hover:text-white text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="ml-auto flex items-center gap-2 text-red-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
