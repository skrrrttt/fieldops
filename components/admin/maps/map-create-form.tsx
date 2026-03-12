'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createStripingMap } from '@/lib/maps/actions';

export function MapCreateForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [versionLabel, setVersionLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError('');

    const result = await createStripingMap({
      name: name.trim(),
      description: description.trim() || undefined,
      version_label: versionLabel.trim() || undefined,
    });

    if (result.success && result.data) {
      router.push(`/admin/maps/${result.data.id}`);
    } else {
      setError(result.error || 'Failed to create map');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border max-w-xl">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label htmlFor="map-name" className="block text-sm font-medium text-foreground mb-1">
            Map Name
          </label>
          <input
            id="map-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Downtown 2025"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            required
          />
        </div>

        <div>
          <label htmlFor="map-description" className="block text-sm font-medium text-foreground mb-1">
            Description <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="map-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes about this striping plan..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none"
          />
        </div>

        <div>
          <label htmlFor="map-version" className="block text-sm font-medium text-foreground mb-1">
            Version Label <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="map-version"
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="e.g. 2025, Rev A"
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting ? 'Creating...' : 'Create & Open Editor'}
          </button>
        </div>
      </form>
    </div>
  );
}
