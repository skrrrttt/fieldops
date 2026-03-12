'use client';

import { useState } from 'react';
import { Trash2, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { reverseGeocodeRoadName } from '@/lib/maps/geocode';
import type { StripingSegment, StripeType, SegmentAttributes } from '@/lib/maps/types';
import { STRIPE_TYPE_CONFIG, STRIPE_TYPES } from '@/lib/maps/types';

interface SegmentPanelProps {
  segments: StripingSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onUpdateSegment: (id: string, updates: Partial<Pick<StripingSegment, 'name' | 'stripe_type' | 'attributes' | 'notes' | 'geometry'>>) => void;
  onDeleteSegment: (id: string) => void;
}

export function SegmentPanel({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onUpdateSegment,
  onDeleteSegment,
}: SegmentPanelProps) {
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? null;

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col overflow-hidden flex-shrink-0">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-muted-foreground" />
          Segments ({segments.length})
        </h3>
      </div>

      {selectedSegment ? (
        <SegmentEditor
          segment={selectedSegment}
          onUpdate={(updates) => onUpdateSegment(selectedSegment.id, updates)}
          onDelete={() => onDeleteSegment(selectedSegment.id)}
          onBack={() => onSelectSegment(null)}
        />
      ) : (
        <SegmentList
          segments={segments}
          onSelect={onSelectSegment}
        />
      )}
    </div>
  );
}

function SegmentList({
  segments,
  onSelect,
}: {
  segments: StripingSegment[];
  onSelect: (id: string) => void;
}) {
  if (segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
        <div>
          <p>No segments yet.</p>
          <p className="mt-1 text-xs">Use the drawing tools on the map to add road segments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {segments.map((seg, i) => (
        <button
          key={seg.id}
          onClick={() => onSelect(seg.id)}
          className="flex items-center gap-3 w-full p-3 text-left hover:bg-muted/50 transition-colors border-b border-border"
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.color ?? '#888' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {seg.name || `Segment ${i + 1}`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.label ?? seg.stripe_type}
              {seg.notes && ` — ${seg.notes}`}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      ))}
    </div>
  );
}

function SegmentEditor({
  segment,
  onUpdate,
  onDelete,
  onBack,
}: {
  segment: StripingSegment;
  onUpdate: (updates: Partial<Pick<StripingSegment, 'name' | 'stripe_type' | 'attributes' | 'notes'>>) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(segment.name ?? '');
  const [isAutoNaming, setIsAutoNaming] = useState(false);
  const [notes, setNotes] = useState(segment.notes ?? '');
  const [attributes, setAttributes] = useState<SegmentAttributes>(
    (segment.attributes as SegmentAttributes) ?? {}
  );

  const handleNameBlur = () => {
    if (name !== (segment.name ?? '')) {
      onUpdate({ name: name || null });
    }
  };

  const handleAutoName = async () => {
    setIsAutoNaming(true);
    const coords = segment.geometry.coordinates;
    const start = coords[0];
    const end = coords[coords.length - 1];
    const autoName = await reverseGeocodeRoadName(start, end);
    if (autoName) {
      setName(autoName);
      onUpdate({ name: autoName });
    }
    setIsAutoNaming(false);
  };

  const handleNotesBlur = () => {
    if (notes !== (segment.notes ?? '')) {
      onUpdate({ notes: notes || null });
    }
  };

  const handleAttributeChange = (key: keyof SegmentAttributes, value: unknown) => {
    const newAttrs = { ...attributes, [key]: value };
    setAttributes(newAttrs);
    onUpdate({ attributes: newAttrs });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-1 w-full p-3 text-sm text-primary hover:bg-muted/50 border-b border-border"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        Back to list
      </button>

      <div className="p-3 space-y-4">
        {/* Segment Name */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Name
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g. Main St"
              className="flex-1 px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={handleAutoName}
              disabled={isAutoNaming}
              title="Auto-detect road name"
              className="px-2 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${isAutoNaming ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Auto-generated from road. Tap to edit.
          </p>
        </div>

        {/* Stripe Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Stripe Type
          </label>
          <select
            value={segment.stripe_type}
            onChange={(e) => onUpdate({ stripe_type: e.target.value as StripeType })}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
          >
            {STRIPE_TYPES.map((type) => (
              <option key={type} value={type}>
                {STRIPE_TYPE_CONFIG[type].label}
              </option>
            ))}
          </select>
        </div>

        {/* Width */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Width (inches)
          </label>
          <input
            type="number"
            value={attributes.width_inches ?? ''}
            onChange={(e) => handleAttributeChange('width_inches', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="e.g. 4"
            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Reflective */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reflective"
            checked={attributes.reflective ?? false}
            onChange={(e) => handleAttributeChange('reflective', e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="reflective" className="text-sm text-foreground">
            Reflective beads
          </label>
        </div>

        {/* Paint Type */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Paint Type
          </label>
          <select
            value={attributes.paint_type ?? ''}
            onChange={(e) => handleAttributeChange('paint_type', e.target.value || undefined)}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground"
          >
            <option value="">Not specified</option>
            <option value="waterborne">Waterborne</option>
            <option value="thermoplastic">Thermoplastic</option>
            <option value="epoxy">Epoxy</option>
            <option value="mma">MMA</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Per-segment instructions..."
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground resize-none"
          />
        </div>

        {/* Coordinates info */}
        <div className="text-xs text-muted-foreground">
          {segment.geometry.coordinates.length} points in geometry
        </div>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm('Delete this segment?')) onDelete();
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Segment
        </button>
      </div>
    </div>
  );
}
