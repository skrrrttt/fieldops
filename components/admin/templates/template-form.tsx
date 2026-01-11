'use client';

import { useState } from 'react';
import type { TaskTemplate, Division, CustomFieldDefinition, FieldType } from '@/lib/database.types';

interface TemplateFormData {
  name: string;
  default_title: string | null;
  default_description: string | null;
  default_division_id: string | null;
  default_custom_fields: Record<string, unknown> | null;
}

interface TemplateFormProps {
  template?: TaskTemplate | null;
  divisions: Division[];
  customFields: CustomFieldDefinition[];
  onSubmit: (data: TemplateFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TemplateForm({
  template,
  divisions,
  customFields,
  onSubmit,
  onCancel,
  isLoading,
}: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '');
  const [defaultTitle, setDefaultTitle] = useState(template?.default_title || '');
  const [defaultDescription, setDefaultDescription] = useState(template?.default_description || '');
  const [defaultDivisionId, setDefaultDivisionId] = useState(template?.default_division_id || '');
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>(
    (template?.default_custom_fields as Record<string, unknown>) || {}
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build custom fields object, only including non-empty values
    const filteredCustomFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(customFieldValues)) {
      if (value !== '' && value !== null && value !== undefined) {
        filteredCustomFields[key] = value;
      }
    }

    await onSubmit({
      name,
      default_title: defaultTitle.trim() || null,
      default_description: defaultDescription.trim() || null,
      default_division_id: defaultDivisionId || null,
      default_custom_fields: Object.keys(filteredCustomFields).length > 0 ? filteredCustomFields : null,
    });

    if (!template) {
      // Reset form after creating new template
      setName('');
      setDefaultTitle('');
      setDefaultDescription('');
      setDefaultDivisionId('');
      setCustomFieldValues({});
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setCustomFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const renderCustomFieldInput = (field: CustomFieldDefinition) => {
    const value = customFieldValues[field.id];
    const inputClasses =
      'mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={(value as string) || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={inputClasses}
            placeholder={`Default value for ${field.name}`}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={(value as number) ?? ''}
            onChange={(e) =>
              handleCustomFieldChange(field.id, e.target.value ? parseFloat(e.target.value) : '')
            }
            className={inputClasses}
            placeholder={`Default value for ${field.name}`}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={inputClasses}
          />
        );
      case 'dropdown':
        return (
          <select
            value={(value as string) || ''}
            onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
            className={inputClasses}
          >
            <option value="">No default</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-3 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`custom-field-${field.id}`}
                checked={value === undefined || value === null}
                onChange={() => handleCustomFieldChange(field.id, null)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">No default</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`custom-field-${field.id}`}
                checked={value === true}
                onChange={() => handleCustomFieldChange(field.id, true)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Checked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`custom-field-${field.id}`}
                checked={value === false}
                onChange={() => handleCustomFieldChange(field.id, false)}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Unchecked</span>
            </label>
          </div>
        );
      default:
        return null;
    }
  };

  const getFieldTypeIcon = (fieldType: FieldType): React.ReactNode => {
    switch (fieldType) {
      case 'text':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        );
      case 'number':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      case 'date':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'dropdown':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        );
      case 'checkbox':
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Template Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., Routine Maintenance, Emergency Repair"
        />
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          A descriptive name for this template.
        </p>
      </div>

      {/* Default Title */}
      <div>
        <label htmlFor="default_title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default Task Title
        </label>
        <input
          type="text"
          id="default_title"
          value={defaultTitle}
          onChange={(e) => setDefaultTitle(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g., Routine Maintenance Check"
        />
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pre-fills the task title when using this template.
        </p>
      </div>

      {/* Default Description */}
      <div>
        <label htmlFor="default_description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default Task Description
        </label>
        <textarea
          id="default_description"
          value={defaultDescription}
          onChange={(e) => setDefaultDescription(e.target.value)}
          rows={4}
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Default instructions or description for this type of task..."
        />
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pre-fills the task description when using this template.
        </p>
      </div>

      {/* Default Division */}
      <div>
        <label htmlFor="default_division" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Default Division
        </label>
        <select
          id="default_division"
          value={defaultDivisionId}
          onChange={(e) => setDefaultDivisionId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-white shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">No default division</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pre-selects the division when using this template.
        </p>
      </div>

      {/* Default Custom Field Values */}
      {customFields.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
            Default Custom Field Values
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Set default values for custom fields when using this template.
          </p>
          <div className="space-y-4 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
            {customFields.map((field) => (
              <div key={field.id}>
                <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {getFieldTypeIcon(field.field_type)}
                  </span>
                  {field.name}
                  {field.required && <span className="text-red-500 text-xs">(required)</span>}
                </label>
                {renderCustomFieldInput(field)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
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
