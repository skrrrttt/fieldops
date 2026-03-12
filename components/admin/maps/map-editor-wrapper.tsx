'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import type { MapRef } from 'react-map-gl/mapbox';
import type { StripingMapWithSegments, StripingSegment, StripeType, GeoJSONLineString, SegmentAttributes } from '@/lib/maps/types';
import { updateStripingMap, upsertSegments } from '@/lib/maps/actions';
import { MapEditor } from './map-editor';
import { SegmentPanel } from './segment-panel';
import { TaskAssignmentDialog } from './task-assignment-dialog';

interface MapEditorWrapperProps {
  map: StripingMapWithSegments;
  tasks: Array<{ id: string; title: string }>;
}

export function MapEditorWrapper({ map, tasks }: MapEditorWrapperProps) {
  const router = useRouter();
  const [segments, setSegments] = useState<StripingSegment[]>(map.segments);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [mapName, setMapName] = useState(map.name);
  const mapInstanceRef = useRef<MapRef | null>(null);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? null;

  const handleAddSegment = (geometry: GeoJSONLineString, stripeType: StripeType) => {
    const newSegment: StripingSegment = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      map_id: map.id,
      geometry,
      stripe_type: stripeType,
      attributes: null,
      notes: null,
      order: segments.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSegments(prev => [...prev, newSegment]);
    setSelectedSegmentId(newSegment.id);
    setHasChanges(true);
  };

  const handleUpdateSegment = (id: string, updates: Partial<Pick<StripingSegment, 'stripe_type' | 'attributes' | 'notes' | 'geometry'>>) => {
    setSegments(prev => prev.map(s =>
      s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s
    ));
    setHasChanges(true);
  };

  const handleDeleteSegment = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    if (selectedSegmentId === id) setSelectedSegmentId(null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Capture current viewport from map
    const mapUpdate: Parameters<typeof updateStripingMap>[1] = {};
    if (mapName !== map.name) {
      mapUpdate.name = mapName;
    }
    const mapInstance = mapInstanceRef.current;
    if (mapInstance) {
      const center = mapInstance.getCenter();
      const zoom = mapInstance.getZoom();
      mapUpdate.center_lng = center.lng;
      mapUpdate.center_lat = center.lat;
      mapUpdate.zoom = zoom;
    }
    if (Object.keys(mapUpdate).length > 0) {
      await updateStripingMap(map.id, mapUpdate);
    }

    // Save segments
    const segmentData = segments.map((s, i) => ({
      id: s.id.startsWith('temp_') ? undefined : s.id,
      geometry: s.geometry,
      stripe_type: s.stripe_type as StripeType,
      attributes: s.attributes as SegmentAttributes | null,
      notes: s.notes,
      order: i,
    }));

    const result = await upsertSegments(map.id, segmentData);

    if (result.success && result.data) {
      setSegments(result.data);
      setHasChanges(false);
    }

    setIsSaving(false);
    router.refresh();
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/maps"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <input
            type="text"
            value={mapName}
            onChange={(e) => { setMapName(e.target.value); setHasChanges(true); }}
            className="text-lg font-semibold text-foreground bg-transparent border-none outline-none focus:ring-1 focus:ring-primary rounded px-1"
          />
          {map.version_label && (
            <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
              {map.version_label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssignment(true)}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
          >
            Assign to Task
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="inline-flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Split layout: Map + Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <MapEditor
            segments={segments}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={setSelectedSegmentId}
            onAddSegment={handleAddSegment}
            center={map.center_lng && map.center_lat ? [map.center_lng, map.center_lat] : undefined}
            zoom={map.zoom ?? 17}
            onMapRef={(ref) => { mapInstanceRef.current = ref; }}
          />
        </div>
        <SegmentPanel
          segments={segments}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={setSelectedSegmentId}
          onUpdateSegment={handleUpdateSegment}
          onDeleteSegment={handleDeleteSegment}
        />
      </div>

      {showAssignment && (
        <TaskAssignmentDialog
          segments={segments}
          selectedSegmentIds={selectedSegmentId ? [selectedSegmentId] : segments.map(s => s.id)}
          tasks={tasks}
          onClose={() => setShowAssignment(false)}
        />
      )}
    </div>
  );
}
