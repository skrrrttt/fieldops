'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { StripingMap } from '@/lib/maps/types';
import { cloneStripingMap } from '@/lib/maps/actions';

interface MapCloneDialogProps {
  map: StripingMap;
  onClose: () => void;
}

export function MapCloneDialog({ map, onClose }: MapCloneDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(`${map.name} (Copy)`);
  const [versionLabel, setVersionLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError('');

    const result = await cloneStripingMap(map.id, name.trim(), versionLabel.trim() || undefined);

    if (result.success && result.data) {
      router.push(`/admin/maps/${result.data.id}`);
      onClose();
    } else {
      setError(result.error || 'Failed to clone map');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Clone Map</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a copy of &ldquo;{map.name}&rdquo; with all its segments.
          </p>

          <div>
            <label htmlFor="clone-name" className="block text-sm font-medium text-foreground mb-1">
              New Map Name
            </label>
            <input
              id="clone-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
              required
            />
          </div>

          <div>
            <label htmlFor="clone-version" className="block text-sm font-medium text-foreground mb-1">
              Version Label <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="clone-version"
              type="text"
              value={versionLabel}
              onChange={(e) => setVersionLabel(e.target.value)}
              placeholder="e.g. 2026 Rev A"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? 'Cloning...' : 'Clone Map'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
