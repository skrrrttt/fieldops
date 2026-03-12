'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Copy, Pencil, Trash2, MapIcon } from 'lucide-react';
import type { StripingMap } from '@/lib/maps/types';
import { deleteStripingMap } from '@/lib/maps/actions';
import { MapCloneDialog } from './map-clone-dialog';

interface MapListProps {
  maps: StripingMap[];
  segmentCounts: Record<string, number>;
}

export function MapList({ maps, segmentCounts }: MapListProps) {
  const router = useRouter();
  const [cloneMap, setCloneMap] = useState<StripingMap | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this map?')) return;
    setDeletingId(id);
    const result = await deleteStripingMap(id);
    if (result.success) {
      router.refresh();
    }
    setDeletingId(null);
  };

  return (
    <>
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">All Maps</h2>
          <Link
            href="/admin/maps/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Map
          </Link>
        </div>

        {maps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-lg font-medium">No striping maps yet</p>
            <p className="text-sm mt-1">Create your first map to plan road striping layouts.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {maps.map((map) => (
              <div
                key={map.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <Link href={`/admin/maps/${map.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{map.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {map.version_label && (
                          <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                            {map.version_label}
                          </span>
                        )}
                        <span>{segmentCounts[map.id] || 0} segments</span>
                        <span>
                          {new Date(map.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {map.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {map.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                  <Link
                    href={`/admin/maps/${map.id}`}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => setCloneMap(map)}
                    className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Clone"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(map.id)}
                    disabled={deletingId === map.id}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {cloneMap && (
        <MapCloneDialog
          map={cloneMap}
          onClose={() => setCloneMap(null)}
        />
      )}
    </>
  );
}
