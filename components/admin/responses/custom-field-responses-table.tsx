'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { CustomFieldDefinition } from '@/lib/database.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle, XCircle, Search, ExternalLink } from 'lucide-react';

interface TaskWithCustomFields {
  id: string;
  title: string;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  division: { id: string; name: string; color: string; icon: string | null } | null;
  status: { id: string; name: string; color: string } | null;
}

interface CustomFieldResponsesTableProps {
  tasks: TaskWithCustomFields[];
  customFields: CustomFieldDefinition[];
}

export function CustomFieldResponsesTable({
  tasks,
  customFields,
}: CustomFieldResponsesTableProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tasks based on selected field and search
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.division?.name.toLowerCase().includes(query)
      );
    }

    // Filter by field (only show tasks that have a value for the selected field)
    if (selectedFieldId !== 'all') {
      filtered = filtered.filter(task => {
        const value = task.custom_fields?.[selectedFieldId];
        return value !== undefined && value !== null && value !== '';
      });
    }

    return filtered;
  }, [tasks, selectedFieldId, searchQuery]);

  // Get the selected field definition
  const selectedField = customFields.find(f => f.id === selectedFieldId);

  // Format field value for display
  const formatFieldValue = (value: unknown, fieldType: string): string => {
    if (value === undefined || value === null || value === '') {
      return '—';
    }
    if (fieldType === 'checkbox') {
      return value ? 'Yes' : 'No';
    }
    if (fieldType === 'date' && typeof value === 'string') {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  // Get value component with proper styling
  const renderFieldValue = (value: unknown, fieldType: string) => {
    if (value === undefined || value === null || value === '') {
      return <span className="text-zinc-400">—</span>;
    }
    if (fieldType === 'checkbox') {
      return value ? (
        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-zinc-400">
          <XCircle className="w-4 h-4" />
          No
        </span>
      );
    }
    return <span>{formatFieldValue(value, fieldType)}</span>;
  };

  return (
    <div>
      {/* Filters */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {customFields.map((field) => (
                <SelectItem key={field.id} value={field.id}>
                  {field.name}
                  {field.required && ' *'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Task
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Division
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
              {selectedFieldId === 'all' ? (
                customFields.map((field) => (
                  <th
                    key={field.id}
                    className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400"
                  >
                    {field.name}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </th>
                ))
              ) : (
                <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  {selectedField?.name}
                  {selectedField?.required && <span className="text-red-500 ml-1">*</span>}
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-600 dark:text-zinc-400 w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
            {filteredTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={selectedFieldId === 'all' ? customFields.length + 4 : 5}
                  className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {searchQuery || selectedFieldId !== 'all'
                    ? 'No tasks match your filters'
                    : 'No tasks found'}
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-900 dark:text-white">
                      {task.title}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {new Date(task.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {task.division ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${task.division.color}15`,
                          color: task.division.color,
                          border: `1px solid ${task.division.color}40`,
                        }}
                      >
                        {task.division.icon && <span className="mr-1">{task.division.icon}</span>}
                        {task.division.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {task.status ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${task.status.color}20`,
                          color: task.status.color,
                        }}
                      >
                        {task.status.name}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  {selectedFieldId === 'all' ? (
                    customFields.map((field) => (
                      <td key={field.id} className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                        {renderFieldValue(task.custom_fields?.[field.id], field.field_type)}
                      </td>
                    ))
                  ) : (
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                      {selectedField && renderFieldValue(
                        task.custom_fields?.[selectedFieldId],
                        selectedField.field_type
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/tasks?action=edit&id=${task.id}`}
                      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 text-sm text-zinc-500 dark:text-zinc-400">
        Showing {filteredTasks.length} of {tasks.length} tasks
        {selectedFieldId !== 'all' && selectedField && (
          <span> with &quot;{selectedField.name}&quot; responses</span>
        )}
      </div>
    </div>
  );
}
