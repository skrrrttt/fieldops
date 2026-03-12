'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2 } from 'lucide-react';
import type { TaskSegmentAssignment } from '@/lib/maps/types';

interface ProgressPanelProps {
  mapId: string;
  segmentIds: string[];
}

export function ProgressPanel({ mapId, segmentIds }: ProgressPanelProps) {
  const [assignments, setAssignments] = useState<TaskSegmentAssignment[]>([]);
  const [loading, setLoading] = useState(() => segmentIds.length > 0);

  useEffect(() => {
    if (segmentIds.length === 0) return;

    const supabase = createClient();
    let cancelled = false;

    const fetchAssignments = async () => {
      const { data } = await supabase
        .from('task_segment_assignments')
        .select('*')
        .in('segment_id', segmentIds);
      if (!cancelled) {
        if (data) setAssignments(data as TaskSegmentAssignment[]);
        setLoading(false);
      }
    };

    fetchAssignments();

    const channel = supabase
      .channel(`progress-${mapId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_segment_assignments',
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as TaskSegmentAssignment | undefined;
          if (!record || !segmentIds.includes(record.segment_id)) return;

          if (payload.eventType === 'DELETE') {
            setAssignments(prev => prev.filter(a => a.id !== record.id));
          } else if (payload.eventType === 'INSERT') {
            setAssignments(prev => [...prev, payload.new as TaskSegmentAssignment]);
          } else {
            setAssignments(prev =>
              prev.map(a => a.id === (payload.new as TaskSegmentAssignment).id ? (payload.new as TaskSegmentAssignment) : a)
            );
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [mapId, segmentIds]);

  if (loading) return null;
  if (assignments.length === 0) return null;

  const completed = assignments.filter(a => a.is_complete).length;
  const total = assignments.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-3 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Field Progress</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {completed}/{total} ({percentage}%)
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
