'use client';

import { useState, useEffect } from 'react';
import type { RecurrenceRule, RecurrenceFrequency, User } from '@/lib/database.types';

interface RecurrenceRuleEditorProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
  users: User[];
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string; description: string }[] = [
  { value: 'daily', label: 'Daily', description: 'Every day or every X days' },
  { value: 'weekly', label: 'Weekly', description: 'On specific days of the week' },
  { value: 'biweekly', label: 'Biweekly', description: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly', description: 'On a specific day each month' },
  { value: 'custom', label: 'Custom', description: 'Every X days' },
];

export function RecurrenceRuleEditor({
  value,
  onChange,
  users,
  disabled = false,
}: RecurrenceRuleEditorProps) {
  const [enabled, setEnabled] = useState(value !== null);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(value?.frequency || 'daily');
  const [interval, setInterval] = useState(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek || [1]); // Default Monday
  const [dayOfMonth, setDayOfMonth] = useState(value?.dayOfMonth || 1);
  const [time, setTime] = useState(value?.time || '09:00');
  const [assignTo, setAssignTo] = useState<'unassigned' | 'fixed' | 'rotate'>(value?.assignTo || 'unassigned');
  const [fixedUserId, setFixedUserId] = useState(value?.fixedUserId || '');
  const [rotationUserIds, setRotationUserIds] = useState<string[]>(value?.rotationUserIds || []);

  // Update parent when any value changes
  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }

    const rule: RecurrenceRule = {
      frequency,
      time,
      assignTo,
    };

    if (frequency === 'daily' || frequency === 'custom') {
      rule.interval = interval;
    }

    if (frequency === 'weekly') {
      rule.daysOfWeek = daysOfWeek;
    }

    if (frequency === 'monthly') {
      rule.dayOfMonth = dayOfMonth;
    }

    if (assignTo === 'fixed' && fixedUserId) {
      rule.fixedUserId = fixedUserId;
    }

    if (assignTo === 'rotate' && rotationUserIds.length > 0) {
      rule.rotationUserIds = rotationUserIds;
    }

    onChange(rule);
  }, [enabled, frequency, interval, daysOfWeek, dayOfMonth, time, assignTo, fixedUserId, rotationUserIds, onChange]);

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        // Don't allow removing last day
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== day);
      }
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const toggleRotationUser = (userId: string) => {
    setRotationUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const inputClasses =
    'mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50';

  return (
    <div className="space-y-4">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Recurring Task
          </label>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Automatically generate tasks on a schedule
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Frequency
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
              disabled={disabled}
              className={inputClasses}
            >
              {FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Interval (for daily/custom) */}
          {(frequency === 'daily' || frequency === 'custom') && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Every X {frequency === 'daily' ? 'days' : 'days'}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={disabled}
                className={inputClasses}
              />
            </div>
          )}

          {/* Days of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Days of the Week
              </label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDayOfWeek(day.value)}
                    disabled={disabled}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      daysOfWeek.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                    } disabled:opacity-50`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Day of Month
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                disabled={disabled}
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                If the month has fewer days, the last day will be used.
              </p>
            </div>
          )}

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Generation Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={disabled}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Time when the task will be generated (server timezone).
            </p>
          </div>

          {/* Assignment */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Task Assignment
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignTo"
                  checked={assignTo === 'unassigned'}
                  onChange={() => setAssignTo('unassigned')}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Leave unassigned</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignTo"
                  checked={assignTo === 'fixed'}
                  onChange={() => setAssignTo('fixed')}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Assign to specific user</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="assignTo"
                  checked={assignTo === 'rotate'}
                  onChange={() => setAssignTo('rotate')}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Rotate between users</span>
              </label>
            </div>
          </div>

          {/* Fixed User Select */}
          {assignTo === 'fixed' && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Assign To
              </label>
              <select
                value={fixedUserId}
                onChange={(e) => setFixedUserId(e.target.value)}
                disabled={disabled}
                className={inputClasses}
              >
                <option value="">Select a user...</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name || user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Rotation Users */}
          {assignTo === 'rotate' && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Rotation Members
              </label>
              <div className="space-y-1 max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-md p-2">
                {users.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={rotationUserIds.includes(user.id)}
                      onChange={() => toggleRotationUser(user.id)}
                      disabled={disabled}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {user.display_name || user.email}
                    </span>
                  </label>
                ))}
              </div>
              {rotationUserIds.length > 0 && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {rotationUserIds.length} user(s) in rotation
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
