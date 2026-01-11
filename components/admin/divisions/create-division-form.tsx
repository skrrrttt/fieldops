'use client';

import { useState } from 'react';
import { DivisionForm } from './division-form';
import { createDivision } from '@/lib/divisions/actions';

export function CreateDivisionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (data: { name: string; color: string; icon: string | null }) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createDivision(data);

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error || 'Failed to create division');
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
          Division created successfully!
        </div>
      )}
      <DivisionForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
