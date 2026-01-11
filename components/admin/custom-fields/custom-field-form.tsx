'use client';

import { useState } from 'react';
import type { CustomFieldDefinition, FieldType } from '@/lib/database.types';

interface CustomFieldFormData {
  name: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  order: number;
}

interface CustomFieldFormProps {
  field?: CustomFieldDefinition | null;
  nextOrder?: number;
  onSubmit: (data: CustomFieldFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const FIELD_TYPES: { value: FieldType; label: string; description: string }[] = [
  { value: 'text', label: 'Text', description: 'Single line text input' },
  { value: 'number', label: 'Number', description: 'Numeric input' },
  { value: 'date', label: 'Date', description: 'Date picker' },
  { value: 'dropdown', label: 'Dropdown', description: 'Select from predefined options' },
  { value: 'checkbox', label: 'Checkbox', description: 'Yes/No toggle' },
];

export function CustomFieldForm({ field, nextOrder = 0, onSubmit, onCancel, isLoading }: CustomFieldFormProps) {
  // Initial state from props - form remounts with key={field.id} when switching between fields
  const [name, setName] = useState(field?.name || '');
  const [fieldType, setFieldType] = useState<FieldType>(field?.field_type || 'text');
  const [optionsText, setOptionsText] = useState(field?.options?.join(', ') || '');
  const [required, setRequired] = useState(field?.required || false);
  const [order, setOrder] = useState(field?.order ?? nextOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse options from comma-separated text
    let options: string[] | null = null;
    if (fieldType === 'dropdown' && optionsText.trim()) {
      options = optionsText
        .split(',')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);
    }

    await onSubmit({
      name,
      field_type: fieldType,
      options,
      required,
      order,
    });

    if (!field) {
      // Reset form after creating new field
      setName('');
      setFieldType('text');
      setOptionsText('');
      setRequired(false);
      setOrder(nextOrder + 1);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Field Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Equipment Type, Serial Number"
          />
        </div>

        <div>
          <label htmlFor="field_type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Field Type <span className="text-red-500">*</span>
          </label>
          <select
            id="field_type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {FIELD_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label} - {type.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Options input for dropdown type */}
      {fieldType === 'dropdown' && (
        <div>
          <label htmlFor="options" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Dropdown Options <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            required={fieldType === 'dropdown'}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Enter options separated by commas (e.g., Option A, Option B, Option C)"
          />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Enter each option separated by a comma.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="order" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Order
          </label>
          <input
            type="number"
            id="order"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
            min={0}
            className="mt-1 block w-32 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Lower numbers appear first. You can also drag to reorder.
          </p>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Required field
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              (must be filled when creating/editing tasks)
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim() || (fieldType === 'dropdown' && !optionsText.trim())}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : field ? 'Update Field' : 'Create Field'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
