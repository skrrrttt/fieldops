'use client';

import { useState } from 'react';
import type { TaskTemplate, Division, CustomFieldDefinition } from '@/lib/database.types';
import { TemplateForm } from './template-form';
import { updateTemplate, deleteTemplate } from '@/lib/templates/actions';

interface TemplateFormData {
  name: string;
  default_title: string | null;
  default_description: string | null;
  default_division_id: string | null;
  default_custom_fields: Record<string, unknown> | null;
}

interface TemplateWithDivision extends TaskTemplate {
  division: { id: string; name: string; color: string } | null;
}

interface TemplateListProps {
  templates: TemplateWithDivision[];
  divisions: Division[];
  customFields: CustomFieldDefinition[];
}

export function TemplateList({ templates: initialTemplates, divisions, customFields }: TemplateListProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async (data: TemplateFormData) => {
    if (!editingId) return;

    setIsLoading(true);
    setError(null);

    const result = await updateTemplate(editingId, data);

    setIsLoading(false);

    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.error || 'Failed to update template');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteTemplate(deletingId);

    setIsLoading(false);

    if (result.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== deletingId));
      setDeletingId(null);
    } else {
      setError(result.error || 'Failed to delete template');
    }
  };

  const editingTemplate = templates.find((t) => t.id === editingId);
  const deletingTemplate = templates.find((t) => t.id === deletingId);

  const countDefaultFields = (template: TemplateWithDivision): number => {
    let count = 0;
    if (template.default_title) count++;
    if (template.default_description) count++;
    if (template.default_division_id) count++;
    if (template.default_custom_fields) {
      count += Object.keys(template.default_custom_fields).length;
    }
    return count;
  };

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">No templates yet</h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Templates let you quickly create tasks with pre-filled fields. Use the form above to create one.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {templates.map((template) => (
          <div key={template.id} className="py-4">
            {editingId === template.id ? (
              <TemplateForm
                key={template.id}
                template={editingTemplate}
                divisions={divisions}
                customFields={customFields}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Template icon */}
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <span className="font-medium text-zinc-900 dark:text-white truncate">
                      {template.name}
                    </span>
                  </div>

                  {/* Template details */}
                  <div className="ml-10 space-y-1">
                    {template.default_title && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="text-zinc-500 dark:text-zinc-500">Title:</span>{' '}
                        <span className="font-medium">{template.default_title}</span>
                      </div>
                    )}
                    {template.default_description && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="text-zinc-500 dark:text-zinc-500">Description:</span>{' '}
                        <span className="line-clamp-1">{template.default_description}</span>
                      </div>
                    )}
                    {template.division && (
                      <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                        <span className="text-zinc-500 dark:text-zinc-500">Division:</span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${template.division.color}20`,
                            color: template.division.color,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: template.division.color }}
                          />
                          {template.division.name}
                        </span>
                      </div>
                    )}
                    {template.default_custom_fields &&
                      Object.keys(template.default_custom_fields).length > 0 && (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          <span>
                            {Object.keys(template.default_custom_fields).length} custom field
                            {Object.keys(template.default_custom_fields).length !== 1 ? 's' : ''} set
                          </span>
                        </div>
                      )}
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">
                      {countDefaultFields(template)} default{' '}
                      {countDefaultFields(template) === 1 ? 'value' : 'values'} configured
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(template.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(template.id)}
                    className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Template
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete <strong>{deletingTemplate.name}</strong>? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                disabled={isLoading}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
