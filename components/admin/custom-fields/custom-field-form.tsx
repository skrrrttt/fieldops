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
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Field Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g., Equipment Type, Serial Number"
          />
        </div>

        <div>
          <label htmlFor="field_type" className="block text-sm font-medium text-foreground">
            Field Type <span className="text-red-500">*</span>
          </label>
          <select
            id="field_type"
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as FieldType)}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          <label htmlFor="options" className="block text-sm font-medium text-foreground">
            Dropdown Options <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            required={fieldType === 'dropdown'}
            className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Enter options separated by commas (e.g., Option A, Option B, Option C)"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Enter each option separated by a comma.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="order" className="block text-sm font-medium text-foreground">
            Order
          </label>
          <input
            type="number"
            id="order"
            value={order}
            onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
            min={0}
            className="mt-1 block w-32 rounded-md border border-border bg-card px-3 py-2 text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Lower numbers appear first. You can also drag to reorder.
          </p>
        </div>

        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-foreground">
              Required field
            </span>
            <span className="text-sm text-muted-foreground">
              (must be filled when creating/editing tasks)
            </span>
          </label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim() || (fieldType === 'dropdown' && !optionsText.trim())}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : field ? 'Update Field' : 'Create Field'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
