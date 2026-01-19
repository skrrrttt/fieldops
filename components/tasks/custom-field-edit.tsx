'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CustomFieldDefinition } from '@/lib/database.types';
import { updateTaskCustomFields } from '@/lib/tasks/actions';

interface CustomFieldEditProps {
  taskId: string;
  customFields: CustomFieldDefinition[];
  initialValues: Record<string, unknown>;
}

export function CustomFieldEdit({ taskId, customFields, initialValues }: CustomFieldEditProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, unknown>>(initialValues || {});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateValue = useCallback((fieldId: string, value: unknown) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setSuccess(false);
    setError(null);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateTaskCustomFields(taskId, values);
      if (result.success) {
        setSuccess(true);
        // Use startTransition for non-blocking refresh
        startTransition(() => {
          router.refresh();
        });
      } else {
        setError(result.error || 'Failed to save');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are any changes
  const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues || {});

  if (customFields.length === 0) {
    return null;
  }

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
        Additional Information
      </h2>

      <div className="space-y-4">
        {customFields.map((field) => (
          <div key={field.id}>
            <label
              htmlFor={`field-${field.id}`}
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              {field.name}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>

            {field.field_type === 'text' && (
              <input
                id={`field-${field.id}`}
                type="text"
                value={(values[field.id] as string) || ''}
                onChange={(e) => updateValue(field.id, e.target.value)}
                placeholder={`Enter ${field.name.toLowerCase()}`}
                className="w-full px-3 py-3 text-base border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}

            {field.field_type === 'number' && (
              <input
                id={`field-${field.id}`}
                type="number"
                step="any"
                value={(values[field.id] as number) ?? ''}
                onChange={(e) => updateValue(field.id, e.target.value ? parseFloat(e.target.value) : '')}
                placeholder={`Enter ${field.name.toLowerCase()}`}
                className="w-full px-3 py-3 text-base border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}

            {field.field_type === 'date' && (
              <input
                id={`field-${field.id}`}
                type="date"
                value={(values[field.id] as string) || ''}
                onChange={(e) => updateValue(field.id, e.target.value)}
                className="w-full px-3 py-3 text-base border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}

            {field.field_type === 'dropdown' && (
              <select
                id={`field-${field.id}`}
                value={(values[field.id] as string) || ''}
                onChange={(e) => updateValue(field.id, e.target.value)}
                className="w-full px-3 py-3 text-base border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select {field.name.toLowerCase()}</option>
                {(field.options as string[] | undefined)?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {field.field_type === 'checkbox' && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id={`field-${field.id}`}
                  type="checkbox"
                  checked={!!values[field.id]}
                  onChange={(e) => updateValue(field.id, e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-base text-zinc-700 dark:text-zinc-300">Yes</span>
              </label>
            )}
          </div>
        ))}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 dark:disabled:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
        >
          {isSaving ? (
            <>
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Save Changes
            </>
          )}
        </button>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
            Saved successfully!
          </div>
        )}
      </div>
    </section>
  );
}
