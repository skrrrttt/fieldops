'use client';

import { useState } from 'react';
import { X, Search } from 'lucide-react';
import type { StripingSegment } from '@/lib/maps/types';
import { assignSegmentsToTask } from '@/lib/maps/actions';

interface TaskAssignmentDialogProps {
  segments: StripingSegment[];
  selectedSegmentIds: string[];
  tasks: Array<{ id: string; title: string }>;
  onClose: () => void;
}

export function TaskAssignmentDialog({
  segments,
  selectedSegmentIds,
  tasks,
  onClose,
}: TaskAssignmentDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [segmentIds, setSegmentIds] = useState<string[]>(selectedSegmentIds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const filteredTasks = tasks.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSegment = (id: string) => {
    setSegmentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleAssign = async () => {
    if (!selectedTaskId || segmentIds.length === 0) return;

    setIsSubmitting(true);
    setError('');

    // Filter out temp IDs - only assign saved segments
    const realSegmentIds = segmentIds.filter(id => !id.startsWith('temp_'));

    if (realSegmentIds.length === 0) {
      setError('Save the map first before assigning segments to tasks.');
      setIsSubmitting(false);
      return;
    }

    const result = await assignSegmentsToTask(selectedTaskId, realSegmentIds);

    if (result.success) {
      setSuccess(true);
      setTimeout(onClose, 1500);
    } else {
      setError(result.error || 'Failed to assign segments');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-xl border border-border w-full max-w-lg max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-semibold text-foreground">Assign Segments to Task</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Segment count */}
          <div className="text-sm text-muted-foreground">
            {segmentIds.length} of {segments.length} segments selected
            <button
              onClick={() => setSegmentIds(segmentIds.length === segments.length ? [] : segments.map(s => s.id))}
              className="ml-2 text-primary text-xs hover:underline"
            >
              {segmentIds.length === segments.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Segment checkboxes (collapsible if many) */}
          {segments.length <= 10 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {segments.map((seg, i) => (
                <label key={seg.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={segmentIds.includes(seg.id)}
                    onChange={() => toggleSegment(seg.id)}
                    className="rounded border-border"
                  />
                  <span className="text-foreground">Segment {i + 1} — {seg.stripe_type.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          )}

          {/* Task search */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Select Task
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Task list */}
          <div className="space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg">
            {filteredTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tasks found</p>
            ) : (
              filteredTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedTaskId === task.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {task.title}
                </button>
              ))
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Segments assigned successfully!</p>}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isSubmitting || !selectedTaskId || segmentIds.length === 0 || success}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Assigning...' : 'Assign Segments'}
          </button>
        </div>
      </div>
    </div>
  );
}
