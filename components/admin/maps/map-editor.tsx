'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Map, { Source, Layer, type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import { MousePointer2, Route, Pencil } from 'lucide-react';
import type { StripingSegment, StripeType, GeoJSONLineString, DrawMode } from '@/lib/maps/types';
import { STRIPE_TYPE_CONFIG, STRIPE_TYPES } from '@/lib/maps/types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapEditorProps {
  segments: StripingSegment[];
  selectedSegmentId: string | null;
  onSelectSegment: (id: string | null) => void;
  onAddSegment: (geometry: GeoJSONLineString, stripeType: StripeType) => void;
  center?: [number, number];
  zoom: number;
  onMapRef?: (ref: MapRef | null) => void;
}

export function MapEditor({
  segments,
  selectedSegmentId,
  onSelectSegment,
  onAddSegment,
  center,
  zoom,
  onMapRef,
}: MapEditorProps) {
  const mapRef = useRef<MapRef>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>('select');
  const [drawStripeType, setDrawStripeType] = useState<StripeType>('yellow_centerline');
  const [waypoints, setWaypoints] = useState<[number, number][]>([]);
  const [isSnapping, setIsSnapping] = useState(false);

  // Build GeoJSON FeatureCollection for all segments
  const segmentsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: segments.map((seg) => ({
      type: 'Feature',
      id: seg.id,
      properties: {
        id: seg.id,
        stripe_type: seg.stripe_type,
        color: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.color ?? '#888',
        width: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.width ?? 3,
        selected: seg.id === selectedSegmentId,
      },
      geometry: seg.geometry,
    })),
  };

  // Build GeoJSON for current drawing waypoints
  const drawingGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: waypoints.length >= 2
      ? [{
          type: 'Feature',
          properties: {
            color: STRIPE_TYPE_CONFIG[drawStripeType]?.color ?? '#888',
          },
          geometry: {
            type: 'LineString',
            coordinates: waypoints,
          },
        }]
      : [],
  };

  // Waypoint markers GeoJSON
  const waypointsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: waypoints.map((wp, i) => ({
      type: 'Feature',
      properties: { index: i },
      geometry: { type: 'Point', coordinates: wp },
    })),
  };

  const handleMapClick = useCallback(async (e: MapMouseEvent) => {
    if (drawMode === 'select') {
      // Check if clicked on a segment
      const features = mapRef.current?.queryRenderedFeatures(e.point, {
        layers: ['segments-line'],
      });
      if (features && features.length > 0) {
        onSelectSegment(features[0].properties?.id ?? null);
      } else {
        onSelectSegment(null);
      }
      return;
    }

    // Drawing mode: add waypoint
    const point: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    setWaypoints(prev => [...prev, point]);
  }, [drawMode, onSelectSegment]);

  const finishDrawing = useCallback(async () => {
    if (waypoints.length < 2) {
      setWaypoints([]);
      return;
    }

    if (drawMode === 'snap_draw' && MAPBOX_TOKEN) {
      // Use Mapbox Map Matching API for road snapping
      setIsSnapping(true);
      try {
        const coords = waypoints.map(w => w.join(',')).join(';');
        const url = `https://api.mapbox.com/matching/v5/mapbox/driving/${coords}?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.matchings && data.matchings.length > 0) {
          const geometry: GeoJSONLineString = {
            type: 'LineString',
            coordinates: data.matchings[0].geometry.coordinates,
          };
          onAddSegment(geometry, drawStripeType);
        } else {
          // Fallback to raw waypoints if matching fails
          onAddSegment({ type: 'LineString', coordinates: waypoints }, drawStripeType);
        }
      } catch {
        // Fallback to raw waypoints
        onAddSegment({ type: 'LineString', coordinates: waypoints }, drawStripeType);
      } finally {
        setIsSnapping(false);
      }
    } else {
      // Freeform: use raw waypoints
      onAddSegment({ type: 'LineString', coordinates: waypoints }, drawStripeType);
    }

    setWaypoints([]);
  }, [waypoints, drawMode, drawStripeType, onAddSegment]);

  // Handle Escape and Enter keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWaypoints([]);
        setDrawMode('select');
      }
      if (e.key === 'Enter' && waypoints.length >= 2) {
        finishDrawing();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [waypoints, finishDrawing]);

  const cursorStyle = drawMode === 'select' ? 'default' : 'crosshair';

  return (
    <div className="relative w-full h-full">
      <Map
        ref={(ref) => {
          (mapRef as React.MutableRefObject<MapRef | null>).current = ref;
          onMapRef?.(ref);
        }}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: center?.[0] ?? -98.5795,
          latitude: center?.[1] ?? 39.8283,
          zoom: zoom,
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        cursor={cursorStyle}
        onClick={handleMapClick}
        interactiveLayerIds={drawMode === 'select' ? ['segments-line'] : undefined}
      >
        {/* Existing segments */}
        <Source id="segments" type="geojson" data={segmentsGeoJSON}>
          <Layer
            id="segments-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['get', 'selected'],
                ['*', ['get', 'width'], 1.8],
                ['get', 'width'],
              ],
              'line-opacity': [
                'case',
                ['get', 'selected'],
                1,
                0.8,
              ],
            }}
          />
          {/* Selection halo */}
          <Layer
            id="segments-halo"
            type="line"
            filter={['==', ['get', 'selected'], true]}
            paint={{
              'line-color': '#3B82F6',
              'line-width': ['+', ['get', 'width'], 6],
              'line-opacity': 0.35,
            }}
          />
        </Source>

        {/* Drawing preview */}
        <Source id="drawing" type="geojson" data={drawingGeoJSON}>
          <Layer
            id="drawing-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': 4,
              'line-dasharray': [4, 3],
            }}
          />
        </Source>

        {/* Waypoint markers */}
        <Source id="waypoints" type="geojson" data={waypointsGeoJSON}>
          <Layer
            id="waypoints-circle"
            type="circle"
            paint={{
              'circle-radius': 6,
              'circle-color': '#3B82F6',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#FFFFFF',
            }}
          />
        </Source>
      </Map>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border p-1">
        <ToolbarButton
          active={drawMode === 'select'}
          onClick={() => { setDrawMode('select'); setWaypoints([]); }}
          title="Select (Esc)"
          icon={<MousePointer2 className="w-4 h-4" />}
        />
        <ToolbarButton
          active={drawMode === 'snap_draw'}
          onClick={() => setDrawMode('snap_draw')}
          title="Snap to Road"
          icon={<Route className="w-4 h-4" />}
        />
        <ToolbarButton
          active={drawMode === 'freeform_draw'}
          onClick={() => setDrawMode('freeform_draw')}
          title="Freeform Draw"
          icon={<Pencil className="w-4 h-4" />}
        />
      </div>

      {/* Stripe type selector (visible in draw mode) */}
      {drawMode !== 'select' && (
        <div className="absolute top-4 left-16 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border p-2">
          <p className="text-xs text-muted-foreground mb-1.5 px-1">Stripe Type</p>
          <div className="flex flex-col gap-0.5">
            {STRIPE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setDrawStripeType(type)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                  drawStripeType === type
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span
                  className="w-4 h-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STRIPE_TYPE_CONFIG[type].color }}
                />
                {STRIPE_TYPE_CONFIG[type].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drawing instructions */}
      {drawMode !== 'select' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border px-4 py-2 text-sm text-muted-foreground">
          {waypoints.length === 0
            ? 'Click to place waypoints'
            : `${waypoints.length} points — Press Enter to finish, Esc to cancel`}
          {isSnapping && (
            <span className="ml-2 text-primary font-medium">Snapping to road...</span>
          )}
        </div>
      )}

      {/* Finish drawing button */}
      {waypoints.length >= 2 && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={finishDrawing}
            disabled={isSnapping}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 shadow-lg transition-opacity"
          >
            {isSnapping ? 'Snapping...' : 'Finish Segment'}
          </button>
        </div>
      )}

      {/* No token warning */}
      {!MAPBOX_TOKEN && (
        <div className="absolute top-4 right-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 max-w-64">
          Set <code className="font-mono">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your .env to enable the map.
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
    </button>
  );
}
