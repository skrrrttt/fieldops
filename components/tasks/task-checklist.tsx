'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskChecklistWithDetails } from '@/lib/database.types';
import { toggleChecklistItemCompletion } from '@/lib/checklists/actions';
import {
  ChevronDown,
  ChevronRight,
  ListChecks,
  Check,
  Square,
  CheckSquare,
} from 'lucide-react';

// ProStreet brand constants
const PRIMARY_COLOR = '#f97316';

interface TaskChecklistProps {
  taskChecklists: TaskChecklistWithDetails[];
}

export function TaskChecklist({ taskChecklists }: TaskChecklistProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [expandedSection, setExpandedSection] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState<string[]>([]);
  const [localCompletions, setLocalCompletions] = useState<
    Record<string, Record<string, boolean>>
  >(() => {
    // Initialize from props
    const initial: Record<string, Record<string, boolean>> = {};
    taskChecklists.forEach((tc) => {
      initial[tc.id] = tc.item_completions || {};
    });
    return initial;
  });
  const [pendingItems, setPendingItems] = useState<Set<string>>(new Set());

  const toggleChecklistExpand = (checklistId: string) => {
    setExpandedChecklists((prev) =>
      prev.includes(checklistId)
        ? prev.filter((id) => id !== checklistId)
        : [...prev, checklistId]
    );
  };

  const handleToggleItem = useCallback(
    async (taskChecklistId: string, itemId: string, currentValue: boolean) => {
      // Optimistic update
      const newValue = !currentValue;
      setLocalCompletions((prev) => ({
        ...prev,
        [taskChecklistId]: {
          ...prev[taskChecklistId],
          [itemId]: newValue,
        },
      }));
      setPendingItems((prev) => new Set(prev).add(itemId));

      const result = await toggleChecklistItemCompletion(
        taskChecklistId,
        itemId,
        newValue
      );

      setPendingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });

      if (!result.success) {
        // Revert on error
        setLocalCompletions((prev) => ({
          ...prev,
          [taskChecklistId]: {
            ...prev[taskChecklistId],
            [itemId]: currentValue,
          },
        }));
      } else {
        // Refresh data in background
        startTransition(() => {
          router.refresh();
        });
      }
    },
    [router]
  );

  if (taskChecklists.length === 0) {
    return null;
  }

  // Calculate overall completion stats
  const totalItems = taskChecklists.reduce(
    (sum, tc) => sum + tc.checklist.items.length,
    0
  );
  const completedItems = taskChecklists.reduce((sum, tc) => {
    const completions = localCompletions[tc.id] || {};
    return (
      sum +
      tc.checklist.items.filter((item) => completions[item.id] === true).length
    );
  }, 0);

  const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const isAllComplete = completedItems === totalItems && totalItems > 0;

  return (
    <section className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      {/* Section Header - Collapsible */}
      <button
        onClick={() => setExpandedSection(!expandedSection)}
        className="flex items-center justify-between w-full p-4 text-left min-h-[56px] touch-target"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ListChecks className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              Checklists
              <span className="text-sm font-normal text-zinc-400">
                ({completedItems}/{totalItems})
              </span>
              {isAllComplete && (
                <Check
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: PRIMARY_COLOR }}
                />
              )}
            </h2>
            {/* Mini progress bar */}
            <div className="mt-1.5 w-full max-w-[200px] h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: isAllComplete ? '#22c55e' : PRIMARY_COLOR,
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {expandedSection ? (
            <ChevronDown className="w-5 h-5 text-zinc-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expandedSection && (
        <div className="px-4 pb-4 space-y-3">
          {taskChecklists.map((taskChecklist) => {
            const checklist = taskChecklist.checklist;
            const completions = localCompletions[taskChecklist.id] || {};
            const checklistCompleted = checklist.items.filter(
              (item) => completions[item.id] === true
            ).length;
            const checklistTotal = checklist.items.length;
            const isExpanded = expandedChecklists.includes(checklist.id);

            return (
              <div
                key={taskChecklist.id}
                className="border border-zinc-100 dark:border-zinc-700 rounded-lg overflow-hidden"
              >
                {/* Checklist Header */}
                <button
                  onClick={() => toggleChecklistExpand(checklist.id)}
                  className="flex items-center justify-between w-full p-3 text-left bg-zinc-50 dark:bg-zinc-900/50 min-h-[48px] touch-target"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                      {checklist.name}
                    </span>
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      ({checklistCompleted}/{checklistTotal})
                    </span>
                  </div>
                  {/* Mini progress indicator */}
                  <div className="w-16 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex-shrink-0 ml-2">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${
                          checklistTotal > 0
                            ? (checklistCompleted / checklistTotal) * 100
                            : 0
                        }%`,
                        backgroundColor:
                          checklistCompleted === checklistTotal
                            ? '#22c55e'
                            : PRIMARY_COLOR,
                      }}
                    />
                  </div>
                </button>

                {/* Checklist Items */}
                {isExpanded && (
                  <div className="p-2">
                    {checklist.items.length === 0 ? (
                      <p className="text-sm text-zinc-400 text-center py-4">
                        No items in this checklist
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {checklist.items.map((item) => {
                          const isCompleted = completions[item.id] === true;
                          const isPending = pendingItems.has(item.id);

                          return (
                            <li key={item.id}>
                              <button
                                onClick={() =>
                                  handleToggleItem(
                                    taskChecklist.id,
                                    item.id,
                                    isCompleted
                                  )
                                }
                                disabled={isPending}
                                className={`
                                  flex items-center gap-3 w-full p-3 rounded-lg text-left
                                  min-h-[48px] touch-target transition-colors
                                  ${
                                    isCompleted
                                      ? 'bg-green-50 dark:bg-green-900/20'
                                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                  }
                                  ${isPending ? 'opacity-60' : ''}
                                `}
                              >
                                {isCompleted ? (
                                  <CheckSquare
                                    className="w-5 h-5 flex-shrink-0"
                                    style={{ color: '#22c55e' }}
                                  />
                                ) : (
                                  <Square className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                                )}
                                <span
                                  className={`
                                    flex-1 text-sm
                                    ${
                                      isCompleted
                                        ? 'text-zinc-500 dark:text-zinc-400 line-through'
                                        : 'text-zinc-700 dark:text-zinc-300'
                                    }
                                  `}
                                >
                                  {item.title}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
