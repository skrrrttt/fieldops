'use client';

import { useState, useRef } from 'react';
import type { CustomFieldDefinition, FieldType } from '@/lib/database.types';
import { CustomFieldForm } from './custom-field-form';
import { updateCustomField, deleteCustomField, reorderCustomFields } from '@/lib/custom-fields/actions';

interface CustomFieldFormData {
  name: string;
  field_type: FieldType;
  options: string[] | null;
  required: boolean;
  order: number;
}

interface CustomFieldListProps {
  fields: CustomFieldDefinition[];
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
};

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  ),
  number: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  date: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  dropdown: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  checkbox: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export function CustomFieldList({ fields: initialFields }: CustomFieldListProps) {
  const [fields, setFields] = useState(initialFields);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  const handleEdit = async (data: CustomFieldFormData) => {
    if (!editingId) return;

    setIsLoading(true);
    setError(null);

    const result = await updateCustomField(editingId, data);

    setIsLoading(false);

    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.error || 'Failed to update custom field');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteCustomField(deletingId);

    setIsLoading(false);

    if (result.success) {
      setDeletingId(null);
    } else {
      setError(result.error || 'Failed to delete custom field');
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIdRef.current = id;
  };

  const handleDragEnd = async () => {
    const dragOverId = dragOverIdRef.current;

    if (draggedId && dragOverId && draggedId !== dragOverId) {
      const draggedIndex = fields.findIndex(f => f.id === draggedId);
      const dragOverIndex = fields.findIndex(f => f.id === dragOverId);

      if (draggedIndex !== -1 && dragOverIndex !== -1) {
        const newFields = [...fields];
        const [draggedItem] = newFields.splice(draggedIndex, 1);
        newFields.splice(dragOverIndex, 0, draggedItem);

        // Update local state immediately for optimistic UI
        setFields(newFields);

        // Save new order to server
        const orderedIds = newFields.map(f => f.id);
        const result = await reorderCustomFields(orderedIds);

        if (!result.success) {
          setError(result.error || 'Failed to reorder custom fields');
          // Revert on error
          setFields(fields);
        }
      }
    }

    setDraggedId(null);
    dragOverIdRef.current = null;
  };

  const editingField = fields.find(f => f.id === editingId);
  const deletingField = fields.find(f => f.id === deletingId);

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No custom fields yet. Create your first field above.
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

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Drag and drop to reorder fields.
      </p>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {fields.map((field) => (
          <div
            key={field.id}
            className={`py-4 ${draggedId === field.id ? 'opacity-50' : ''}`}
            draggable={editingId !== field.id}
            onDragStart={(e) => handleDragStart(e, field.id)}
            onDragOver={(e) => handleDragOver(e, field.id)}
            onDragEnd={handleDragEnd}
          >
            {editingId === field.id ? (
              <CustomFieldForm
                key={field.id}
                field={editingField}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Drag handle */}
                  <div className="cursor-grab text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                    </svg>
                  </div>
                  {/* Type icon */}
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {FIELD_TYPE_ICONS[field.field_type]}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {field.name}
                      </span>
                      {field.required && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span>{FIELD_TYPE_LABELS[field.field_type]}</span>
                      {field.field_type === 'dropdown' && field.options && (
                        <span className="text-xs">
                          ({field.options.length} options: {field.options.slice(0, 3).join(', ')}{field.options.length > 3 ? '...' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingId(field.id)}
                    className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingId(field.id)}
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
      {deletingId && deletingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Custom Field
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete <strong>{deletingField.name}</strong>?
              {deletingField.required && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400">
                  Warning: This is a required field. Tasks may have data stored in this field that will no longer be displayed.
                </span>
              )}
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
