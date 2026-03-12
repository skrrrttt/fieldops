'use client';

import { useState, useEffect } from 'react';
import type { TaskSegmentAssignmentWithSegment } from '@/lib/maps/types';
import { TaskMapView } from './task-map-view';

interface TaskMapOfflineWrapperProps {
  taskId: string;
  assignments: TaskSegmentAssignmentWithSegment[];
}

export function TaskMapOfflineWrapper({ taskId, assignments: serverAssignments }: TaskMapOfflineWrapperProps) {
  const [assignments, setAssignments] = useState(serverAssignments);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleComplete = (assignmentId: string, newValue: boolean) => {
    setAssignments(prev =>
      prev.map(a =>
        a.id === assignmentId
          ? { ...a, is_complete: newValue, completed_at: newValue ? new Date().toISOString() : null }
          : a
      )
    );
  };

  return (
    <div className="h-[100dvh] flex flex-col">
      {!isOnline && (
        <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs text-center py-1.5 px-4 flex-shrink-0">
          You&apos;re offline. Changes will sync when reconnected.
        </div>
      )}
      <div className="flex-1">
        <TaskMapView
          taskId={taskId}
          assignments={assignments}
          isOnline={isOnline}
          onToggleComplete={handleToggleComplete}
        />
      </div>
    </div>
  );
}
