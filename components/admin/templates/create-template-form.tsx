'use client';

import { useState } from 'react';
import { TemplateForm } from './template-form';
import { createTemplate } from '@/lib/templates/actions';
import type { Division, CustomFieldDefinition } from '@/lib/database.types';

interface TemplateFormData {
  name: string;
  default_title: string | null;
  default_description: string | null;
  default_division_id: string | null;
  default_custom_fields: Record<string, unknown> | null;
}

interface CreateTemplateFormProps {
  divisions: Division[];
  customFields: CustomFieldDefinition[];
}

export function CreateTemplateForm({ divisions, customFields }: CreateTemplateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const handleSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createTemplate(data);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      setFormKey((prev) => prev + 1); // Force form remount to reset
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to create template');
    }
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
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
