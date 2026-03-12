'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import Map, { Source, Layer, type MapRef, type MapMouseEvent } from 'react-map-gl/mapbox';
import { MousePointer2, Route, Pencil, Search, X, MapPin } from 'lucide-react';
import type { StripingSegment, StripeType, GeoJSONLineString, DrawMode } from '@/lib/maps/types';
import { STRIPE_TYPE_CONFIG, STRIPE_TYPES } from '@/lib/maps/types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// ── Location Search Bar ─────────────────────────────────────────────
interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number];
  bbox?: [number, number, number, number];
}

function MapSearchBar({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const searchPlaces = useCallback(async (q: string) => {
    if (!q.trim() || !MAPBOX_TOKEN) {
      setResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,address,poi&limit=5&country=us`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.features) {
        setResults(data.features.map((f: { id: string; place_name: string; center: [number, number]; bbox?: [number, number, number, number] }) => ({
          id: f.id,
          place_name: f.place_name,
          center: f.center,
          bbox: f.bbox,
        })));
        setIsOpen(true);
      }
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    const map = mapRef.current;
    if (!map) return;

    if (result.bbox) {
      map.fitBounds(
        [
          [result.bbox[0], result.bbox[1]],
          [result.bbox[2], result.bbox[3]],
        ],
        { padding: 60, duration: 1500 }
      );
    } else {
      map.flyTo({ center: result.center, zoom: 15, duration: 1500 });
    }

    setQuery(result.place_name.split(',')[0]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-10 w-72">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search for a town or address..."
          className="w-full pl-9 pr-8 py-2.5 text-sm bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="mt-1 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-muted/80 transition-colors border-b border-border/50 last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-foreground leading-snug">{r.place_name}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && isSearching && results.length === 0 && (
        <div className="mt-1 bg-card/95 backdrop-blur border border-border rounded-lg shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          Searching...
        </div>
      )}
    </div>
  );
}

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
        name: seg.name || '',
        stripe_type: seg.stripe_type,
        color: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.color ?? '#888',
        width: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.width ?? 3,
        selected: seg.id === selectedSegmentId,
      },
      geometry: seg.geometry,
    })),
  };

  // Build midpoint GeoJSON for floating labels
  const midpointsGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: segments
      .filter(seg => seg.name)
      .map((seg) => {
        const coords = seg.geometry.coordinates;
        const mid = coords[Math.floor(coords.length / 2)];
        return {
          type: 'Feature' as const,
          properties: {
            name: seg.name,
            type_label: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.label ?? seg.stripe_type,
            color: STRIPE_TYPE_CONFIG[seg.stripe_type as StripeType]?.color ?? '#888',
          },
          geometry: { type: 'Point' as const, coordinates: mid },
        };
      }),
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
        layers: ['segments-hit', 'segments-line'],
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
        interactiveLayerIds={drawMode === 'select' ? ['segments-hit', 'segments-line'] : undefined}
      >
        {/* Existing segments */}
        <Source id="segments" type="geojson" data={segmentsGeoJSON}>
          {/* Invisible wide hit area for easier tap/click selection */}
          <Layer
            id="segments-hit"
            type="line"
            paint={{
              'line-color': 'transparent',
              'line-width': 24,
              'line-opacity': 0,
            }}
          />
          {/* Outer glow for visibility against basemap roads */}
          <Layer
            id="segments-glow"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': ['+', ['get', 'width'], 14],
              'line-opacity': 0.25,
              'line-blur': 6,
            }}
          />
          {/* Dark casing for contrast against satellite imagery */}
          <Layer
            id="segments-casing"
            type="line"
            paint={{
              'line-color': '#000000',
              'line-width': [
                'case',
                ['get', 'selected'],
                ['*', ['get', 'width'], 3],
                ['+', ['get', 'width'], 6],
              ],
              'line-opacity': 0.8,
            }}
          />
          {/* Segment lines — thick and bold */}
          <Layer
            id="segments-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['get', 'selected'],
                ['*', ['get', 'width'], 2.5],
                ['*', ['get', 'width'], 1.6],
              ],
              'line-opacity': 1,
            }}
          />
          {/* Selection halo */}
          <Layer
            id="segments-halo"
            type="line"
            filter={['==', ['get', 'selected'], true]}
            paint={{
              'line-color': '#3B82F6',
              'line-width': ['+', ['get', 'width'], 10],
              'line-opacity': 0.4,
            }}
          />
        </Source>

        {/* Floating callout labels at segment midpoints */}
        <Source id="midpoints" type="geojson" data={midpointsGeoJSON}>
          {/* Pin dot on the road */}
          <Layer
            id="label-pin"
            type="circle"
            minzoom={11}
            paint={{
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, 16, 5],
              'circle-color': '#FFFFFF',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#000000',
            }}
          />
          {/* Floating name label */}
          <Layer
            id="label-text"
            type="symbol"
            minzoom={11}
            layout={{
              'text-field': [
                'format',
                ['get', 'name'], { 'font-scale': 1.0, 'text-font': ['literal', ['DIN Pro Bold', 'Arial Unicode MS Bold']] },
                '\n', {},
                ['get', 'type_label'], { 'font-scale': 0.8, 'text-font': ['literal', ['DIN Pro Medium', 'Arial Unicode MS Regular']], 'text-color': ['get', 'color'] },
              ],
              'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 12, 18, 14],
              'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
              'text-radial-offset': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 16, 1.2],
              'text-justify': 'auto',
              'text-allow-overlap': false,
              'text-padding': 8,
            }}
            paint={{
              'text-color': '#FFFFFF',
              'text-halo-color': 'rgba(0,0,0,0.85)',
              'text-halo-width': 2.5,
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

      {/* Location search */}
      <MapSearchBar mapRef={mapRef} />

      {/* Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-1 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border p-1.5">
        <ToolbarButton
          active={drawMode === 'select'}
          onClick={() => { setDrawMode('select'); setWaypoints([]); }}
          title="Select (Esc)"
          icon={<MousePointer2 className="w-5 h-5" />}
        />
        <ToolbarButton
          active={drawMode === 'snap_draw'}
          onClick={() => setDrawMode('snap_draw')}
          title="Snap to Road"
          icon={<Route className="w-5 h-5" />}
        />
        <ToolbarButton
          active={drawMode === 'freeform_draw'}
          onClick={() => setDrawMode('freeform_draw')}
          title="Freeform Draw"
          icon={<Pencil className="w-5 h-5" />}
        />
      </div>

      {/* Stripe type selector (visible in draw mode) */}
      {drawMode !== 'select' && (
        <div className="absolute top-4 left-[4.5rem] bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border p-2">
          <p className="text-xs text-muted-foreground mb-1.5 px-1">Stripe Type</p>
          <div className="flex flex-col gap-0.5">
            {STRIPE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setDrawStripeType(type)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded text-sm text-left transition-colors touch-target ${
                  drawStripeType === type
                    ? 'bg-primary/10 text-foreground font-medium'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <span
                  className="w-5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STRIPE_TYPE_CONFIG[type].color }}
                />
                {STRIPE_TYPE_CONFIG[type].label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drawing instructions + actions */}
      {drawMode !== 'select' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {waypoints.length === 0
              ? 'Tap to place waypoints'
              : `${waypoints.length} points`}
            {isSnapping && (
              <span className="ml-2 text-primary font-medium">Snapping...</span>
            )}
          </span>
          {waypoints.length >= 2 && (
            <button
              onClick={finishDrawing}
              disabled={isSnapping}
              className="ml-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity touch-target"
            >
              {isSnapping ? 'Snapping...' : 'Done'}
            </button>
          )}
          {waypoints.length > 0 && (
            <button
              onClick={() => { setWaypoints([]); setDrawMode('select'); }}
              className="px-3 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors touch-target"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* No token warning */}
      {!MAPBOX_TOKEN && (
        <div className="absolute top-16 right-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 max-w-64">
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
      className={`p-3 rounded-lg transition-colors touch-target ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {icon}
    </button>
  );
}
