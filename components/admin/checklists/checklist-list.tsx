'use client';

import { useState, useRef, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ChecklistWithItems } from '@/lib/database.types';
import { ChecklistForm } from './checklist-form';
import {
  updateChecklist,
  deleteChecklist,
  reorderChecklists,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
  getNextChecklistItemOrder,
} from '@/lib/checklists/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  GripVertical,
  ListChecks,
} from 'lucide-react';

interface ChecklistFormData {
  name: string;
  description: string | null;
  order: number;
}

interface ChecklistListProps {
  checklists: ChecklistWithItems[];
}

export function ChecklistList({ checklists: initialChecklists }: ChecklistListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [checklists, setChecklists] = useState(initialChecklists);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dragOverIdRef = useRef<string | null>(null);

  // Item management state
  const [newItemTitle, setNewItemTitle] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemTitle, setEditingItemTitle] = useState('');
  const [itemLoading, setItemLoading] = useState<string | null>(null);

  // Sync local state when props change (after router.refresh())
  useEffect(() => {
    setChecklists(initialChecklists);
  }, [initialChecklists]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleEdit = async (data: ChecklistFormData) => {
    if (!editingId) return;

    setIsLoading(true);
    setError(null);

    const result = await updateChecklist(editingId, data);

    setIsLoading(false);

    if (result.success) {
      setEditingId(null);
    } else {
      setError(result.error || 'Failed to update checklist');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsLoading(true);
    setError(null);

    const result = await deleteChecklist(deletingId);

    setIsLoading(false);

    if (result.success) {
      setDeletingId(null);
    } else {
      setError(result.error || 'Failed to delete checklist');
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
      const draggedIndex = checklists.findIndex((c) => c.id === draggedId);
      const dragOverIndex = checklists.findIndex((c) => c.id === dragOverId);

      if (draggedIndex !== -1 && dragOverIndex !== -1) {
        const newChecklists = [...checklists];
        const [draggedItem] = newChecklists.splice(draggedIndex, 1);
        newChecklists.splice(dragOverIndex, 0, draggedItem);

        // Update local state immediately for optimistic UI
        setChecklists(newChecklists);

        // Save new order to server
        const orderedIds = newChecklists.map((c) => c.id);
        const result = await reorderChecklists(orderedIds);

        if (!result.success) {
          setError(result.error || 'Failed to reorder checklists');
          // Revert on error
          setChecklists(checklists);
        }
      }
    }

    setDraggedId(null);
    dragOverIdRef.current = null;
  };

  // ============= Item Management =============

  const handleAddItem = async (checklistId: string) => {
    const title = newItemTitle[checklistId]?.trim();
    if (!title) return;

    setItemLoading(checklistId);
    const nextOrder = await getNextChecklistItemOrder(checklistId);
    const result = await createChecklistItem({
      checklist_id: checklistId,
      title,
      order: nextOrder,
    });

    setItemLoading(null);

    if (result.success) {
      setNewItemTitle((prev) => ({ ...prev, [checklistId]: '' }));
      // Refresh to get updated data
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to add item');
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    const title = editingItemTitle.trim();
    if (!title) return;

    setItemLoading(itemId);
    const result = await updateChecklistItem(itemId, { title });
    setItemLoading(null);

    if (result.success) {
      setEditingItemId(null);
      setEditingItemTitle('');
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setItemLoading(itemId);
    const result = await deleteChecklistItem(itemId);
    setItemLoading(null);

    if (result.success) {
      startTransition(() => {
        router.refresh();
      });
    } else {
      setError(result.error || 'Failed to delete item');
    }
  };

  const handleItemDragStart = (
    e: React.DragEvent,
    checklistId: string,
    itemId: string
  ) => {
    e.dataTransfer.setData('itemId', itemId);
    e.dataTransfer.setData('checklistId', checklistId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleItemDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleItemDrop = async (
    e: React.DragEvent,
    checklistId: string,
    targetItemId: string
  ) => {
    e.preventDefault();
    const draggedItemId = e.dataTransfer.getData('itemId');
    const sourceChecklistId = e.dataTransfer.getData('checklistId');

    // Only handle drops within the same checklist
    if (sourceChecklistId !== checklistId || draggedItemId === targetItemId) {
      return;
    }

    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return;

    const draggedIndex = checklist.items.findIndex((i) => i.id === draggedItemId);
    const targetIndex = checklist.items.findIndex((i) => i.id === targetItemId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newItems = [...checklist.items];
    const [draggedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    // Optimistic update
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId ? { ...c, items: newItems } : c
      )
    );

    // Save to server
    const orderedIds = newItems.map((i) => i.id);
    const result = await reorderChecklistItems(orderedIds);

    if (!result.success) {
      setError(result.error || 'Failed to reorder items');
      // Revert
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, items: checklist.items } : c
        )
      );
    }
  };

  const editingChecklist = checklists.find((c) => c.id === editingId);
  const deletingChecklist = checklists.find((c) => c.id === deletingId);

  if (checklists.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
          <ListChecks className="w-7 h-7 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
          No checklists yet
        </h3>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          Create checklists to standardize task workflows. Use the form above to
          add your first checklist.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Drag and drop to reorder checklists. Click to expand and manage items.
      </p>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
        {checklists.map((checklist) => (
          <div
            key={checklist.id}
            className={`py-4 ${draggedId === checklist.id ? 'opacity-50' : ''}`}
            draggable={editingId !== checklist.id}
            onDragStart={(e) => handleDragStart(e, checklist.id)}
            onDragOver={(e) => handleDragOver(e, checklist.id)}
            onDragEnd={handleDragEnd}
          >
            {editingId === checklist.id ? (
              <ChecklistForm
                checklist={editingChecklist}
                onSubmit={handleEdit}
                onCancel={() => setEditingId(null)}
                isLoading={isLoading}
              />
            ) : (
              <>
                {/* Checklist Header */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(checklist.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {/* Drag handle */}
                    <div className="cursor-grab text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-400">
                      <GripVertical className="w-5 h-5" />
                    </div>
                    {/* Expand icon */}
                    {expandedIds.includes(checklist.id) ? (
                      <ChevronDown className="w-5 h-5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    )}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {checklist.name}
                        </span>
                        <span className="text-xs text-zinc-400">
                          ({checklist.items.length} items)
                        </span>
                      </div>
                      {checklist.description && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {checklist.description}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingId(checklist.id)}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingId(checklist.id)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Expanded Items Section */}
                {expandedIds.includes(checklist.id) && (
                  <div className="mt-4 ml-8 pl-4 border-l-2 border-zinc-200 dark:border-zinc-700">
                    {/* Items List */}
                    {checklist.items.length > 0 ? (
                      <ul className="space-y-2 mb-4">
                        {checklist.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center gap-2 group"
                            draggable={editingItemId !== item.id}
                            onDragStart={(e) =>
                              handleItemDragStart(e, checklist.id, item.id)
                            }
                            onDragOver={handleItemDragOver}
                            onDrop={(e) =>
                              handleItemDrop(e, checklist.id, item.id)
                            }
                          >
                            <GripVertical className="w-4 h-4 text-zinc-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                            {editingItemId === item.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editingItemTitle}
                                  onChange={(e) =>
                                    setEditingItemTitle(e.target.value)
                                  }
                                  className="h-8 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateItem(item.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingItemId(null);
                                      setEditingItemTitle('');
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateItem(item.id)}
                                  disabled={itemLoading === item.id}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingItemId(null);
                                    setEditingItemTitle('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className="flex-1 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer hover:text-zinc-900 dark:hover:text-white"
                                  onClick={() => {
                                    setEditingItemId(item.id);
                                    setEditingItemTitle(item.title);
                                  }}
                                >
                                  {item.title}
                                </span>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={itemLoading === item.id}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-zinc-400 mb-4">
                        No items yet. Add items below.
                      </p>
                    )}

                    {/* Add Item Input */}
                    <div className="flex items-center gap-2">
                      <Input
                        value={newItemTitle[checklist.id] || ''}
                        onChange={(e) =>
                          setNewItemTitle((prev) => ({
                            ...prev,
                            [checklist.id]: e.target.value,
                          }))
                        }
                        placeholder="Add new item..."
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddItem(checklist.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddItem(checklist.id)}
                        disabled={
                          !newItemTitle[checklist.id]?.trim() ||
                          itemLoading === checklist.id
                        }
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && deletingChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
              Delete Checklist
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Are you sure you want to delete{' '}
              <strong>{deletingChecklist.name}</strong>?
              {deletingChecklist.items.length > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  This checklist has {deletingChecklist.items.length} items that
                  will also be deleted.
                </span>
              )}
            </p>
            {error && deletingId && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeletingId(null);
                  setError(null);
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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
