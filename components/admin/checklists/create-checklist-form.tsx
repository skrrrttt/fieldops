'use client';

import { useState } from 'react';
import { ChecklistForm } from './checklist-form';
import { createChecklist } from '@/lib/checklists/actions';

interface ChecklistFormData {
  name: string;
  description: string | null;
  order: number;
}

interface CreateChecklistFormProps {
  nextOrder: number;
}

export function CreateChecklistForm({ nextOrder }: CreateChecklistFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentNextOrder, setCurrentNextOrder] = useState(nextOrder);

  const handleSubmit = async (data: ChecklistFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createChecklist(data);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      setCurrentNextOrder((prev) => prev + 1);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to create checklist');
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
          Checklist created successfully! Add items to it below.
        </div>
      )}
      <ChecklistForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        nextOrder={currentNextOrder}
      />
    </div>
  );
}
