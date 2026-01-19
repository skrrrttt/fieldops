'use client';

import { useState } from 'react';
import { TemplateForm, type TemplateFormData } from './template-form';
import { createTemplate } from '@/lib/templates/actions';
import { activateRecurringTemplate } from '@/lib/templates/recurring';
import type { Division, CustomFieldDefinition, User } from '@/lib/database.types';

interface CreateTemplateFormProps {
  divisions: Division[];
  customFields: CustomFieldDefinition[];
  users: User[];
}

export function CreateTemplateForm({ divisions, customFields, users }: CreateTemplateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Create the template first
    const result = await createTemplate({
      name: data.name,
      default_title: data.default_title,
      default_description: data.default_description,
      default_division_id: data.default_division_id,
      default_custom_fields: data.default_custom_fields,
    });

    if (!result.success) {
      setIsLoading(false);
      setError(result.error || 'Failed to create template');
      return;
    }

    // If recurrence rule is set, activate it
    if (data.recurrence_rule && result.data) {
      const recurResult = await activateRecurringTemplate(result.data.id, data.recurrence_rule);
      if (!recurResult.success) {
        setIsLoading(false);
        setError(recurResult.error || 'Template created but failed to set up recurrence');
        return;
      }
    }

    setIsLoading(false);
    setSuccess(true);
    setFormKey((prev) => prev + 1); // Force form remount to reset
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-700 dark:text-green-400 text-sm">
          Template created successfully!
        </div>
      )}
      <TemplateForm
        key={formKey}
        divisions={divisions}
        customFields={customFields}
        users={users}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
