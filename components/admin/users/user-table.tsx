'use client';

import { useState } from 'react';
import type { User, UserRole } from '@/lib/database.types';
import { InviteUserModal } from './invite-user-modal';
import { updateUserRole, deactivateUser, reactivateUser } from '@/lib/users/actions';

interface UserTableProps {
  users: User[];
  currentUserId: string;
}

export function UserTable({ users, currentUserId }: UserTableProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>('field_user');
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleEditRole = (user: User) => {
    setEditingUserId(user.id);
    setEditingRole(user.role);
    setError(null);
    setSuccess(null);
  };

  const handleSaveRole = async (userId: string) => {
    setIsLoading(userId);
    setError(null);

    const result = await updateUserRole(userId, editingRole);

    if (result.success) {
      setSuccess('Role updated successfully');
      setEditingUserId(null);
    } else {
      setError(result.error || 'Failed to update role');
    }

    setIsLoading(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setError(null);
  };

  const handleDeactivate = async (userId: string) => {
    setIsLoading(userId);
    setError(null);

    const result = await deactivateUser(userId);

    if (result.success) {
      setSuccess('User deactivated successfully');
      setConfirmDeactivate(null);
    } else {
      setError(result.error || 'Failed to deactivate user');
    }

    setIsLoading(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleReactivate = async (userId: string) => {
    setIsLoading(userId);
    setError(null);

    const result = await reactivateUser(userId);

    if (result.success) {
      setSuccess('User reactivated successfully');
    } else {
      setError(result.error || 'Failed to reactivate user');
    }

    setIsLoading(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        if (diffMins === 0) return 'Just now';
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  };

  const inactiveUsers = users.filter((u) => !u.is_active);

  return (
    <div>
      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />

      {/* Header with Invite Button */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {users.length} {users.length === 1 ? 'user' : 'users'} total
          {inactiveUsers.length > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">
              ({inactiveUsers.length} deactivated)
            </span>
          )}
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          Invite User
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Last Active
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-white">
                Status
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-900 dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                      <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No users yet</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-4">
                      Invite team members to start collaborating on tasks.
                    </p>
                    <button
                      onClick={() => setIsInviteModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Invite User
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-zinc-50 dark:hover:bg-zinc-700/50 ${
                    !user.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          user.is_active ? 'bg-blue-600' : 'bg-zinc-400'
                        }`}
                      >
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-zinc-900 dark:text-white">
                          {user.email}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingUserId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as UserRole)}
                          className="px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                          disabled={isLoading === user.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="field_user">Field User</option>
                        </select>
                        <button
                          onClick={() => handleSaveRole(user.id)}
                          disabled={isLoading === user.id}
                          className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {isLoading === user.id ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isLoading === user.id}
                          className="px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Field User'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(user.last_active_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-400'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingUserId !== user.id && (
                        <button
                          onClick={() => handleEditRole(user)}
                          disabled={user.id === currentUserId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={user.id === currentUserId ? "You can't change your own role" : 'Edit role'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      )}

                      {confirmDeactivate === user.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            Confirm?
                          </span>
                          <button
                            onClick={() => handleDeactivate(user.id)}
                            disabled={isLoading === user.id}
                            className="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            {isLoading === user.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeactivate(null)}
                            disabled={isLoading === user.id}
                            className="px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          >
                            No
                          </button>
                        </div>
                      ) : user.is_active ? (
                        <button
                          onClick={() => setConfirmDeactivate(user.id)}
                          disabled={user.id === currentUserId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={user.id === currentUserId ? "You can't deactivate yourself" : 'Deactivate user'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(user.id)}
                          disabled={isLoading === user.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Reactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
