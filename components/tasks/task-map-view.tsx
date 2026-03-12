'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import Map, { Source, Layer, GeolocateControl, type MapRef } from 'react-map-gl/mapbox';
import { ArrowLeft, CheckCircle2, Circle, X, MapPin, List, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import type { TaskSegmentAssignmentWithSegment, StripeType } from '@/lib/maps/types';
import { STRIPE_TYPE_CONFIG } from '@/lib/maps/types';
import { markSegmentComplete } from '@/lib/maps/actions';
import { queueSegmentCompleteMutation } from '@/lib/offline/mutation-queue';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

/** Haversine distance between two [lng, lat] coords, returns feet */
function segmentLengthFeet(coords: [number, number][]): number {
  let totalMeters = 0;
  for (let i = 1; i < coords.length; i++) {
    const [lng1, lat1] = coords[i - 1];
    const [lng2, lat2] = coords[i];
    const R = 6371000; // earth radius in meters
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    totalMeters += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  return totalMeters * 3.28084;
}

function formatLength(feet: number): string {
  if (feet >= 5280) {
    return `${(feet / 5280).toFixed(2)} mi`;
  }
  return `${Math.round(feet).toLocaleString()} ft`;
}

interface TaskMapViewProps {
  taskId: string;
  assignments: TaskSegmentAssignmentWithSegment[];
  isOnline: boolean;
  onToggleComplete: (assignmentId: string, newValue: boolean) => void;
}

export function TaskMapView({ taskId, assignments, isOnline, onToggleComplete }: TaskMapViewProps) {
  const mapRef = useRef<MapRef>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geolocateRef = useRef<any>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

  const selectedAssignment = assignments.find(a => a.id === selectedId) ?? null;

  // Calculate bounds for auto-fit
  const bounds = useMemo(() => {
    const allCoords = assignments.flatMap(a => a.segment.geometry.coordinates);
    if (allCoords.length === 0) return null;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const [lng, lat] of allCoords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return [[minLng, minLat], [maxLng, maxLat]] as [[number, number], [number, number]];
  }, [assignments]);

  // Build GeoJSON
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: assignments.map((a) => ({
      type: 'Feature',
      id: a.id,
      properties: {
        id: a.id,
        name: a.segment.name || '',
        stripe_type: a.segment.stripe_type,
        color: STRIPE_TYPE_CONFIG[a.segment.stripe_type as StripeType]?.color ?? '#888',
        width: STRIPE_TYPE_CONFIG[a.segment.stripe_type as StripeType]?.width ?? 3,
        is_complete: a.is_complete,
        selected: a.id === selectedId,
      },
      geometry: a.segment.geometry,
    })),
  };

  // Reverse geocode the center of segments to get city/town name
  useEffect(() => {
    if (!bounds || !MAPBOX_TOKEN) return;
    const centerLng = (bounds[0][0] + bounds[1][0]) / 2;
    const centerLat = (bounds[0][1] + bounds[1][1]) / 2;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${centerLng},${centerLat}.json?types=place,locality,neighborhood&limit=1&access_token=${MAPBOX_TOKEN}`
    )
      .then(r => r.json())
      .then(data => {
        if (data.features?.[0]) {
          setPlaceName(data.features[0].place_name || data.features[0].text);
        }
      })
      .catch(() => {});
  }, [bounds]);

  const completedCount = assignments.filter(a => a.is_complete).length;
  const totalCount = assignments.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleMapClick = useCallback((e: mapboxgl.MapMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(e.point, {
      layers: ['task-segments-hit', 'task-segments-line'],
    });
    if (features && features.length > 0) {
      setSelectedId(features[0].properties?.id ?? null);
    } else {
      setSelectedId(null);
    }
  }, []);

  const handleToggle = async () => {
    if (!selectedAssignment || isToggling) return;
    const newValue = !selectedAssignment.is_complete;

    setIsToggling(true);
    onToggleComplete(selectedAssignment.id, newValue);

    if (isOnline) {
      await markSegmentComplete(selectedAssignment.id, newValue);
    } else {
      await queueSegmentCompleteMutation({
        assignment_id: selectedAssignment.id,
        is_complete: newValue,
      });
    }

    setIsToggling(false);
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          bounds: bounds ?? undefined,
          fitBoundsOptions: { padding: 60 },
          longitude: bounds ? (bounds[0][0] + bounds[1][0]) / 2 : -98.58,
          latitude: bounds ? (bounds[0][1] + bounds[1][1]) / 2 : 39.83,
          zoom: 15,
        }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        onClick={handleMapClick}
        onLoad={() => {
          // Auto-trigger geolocation after map loads
          setTimeout(() => geolocateRef.current?.trigger(), 500);
        }}
        interactiveLayerIds={['task-segments-hit', 'task-segments-line']}
      >
        <Source id="task-segments" type="geojson" data={geojson}>
          {/* Invisible wide hit area for easier tap selection */}
          <Layer
            id="task-segments-hit"
            type="line"
            paint={{
              'line-color': 'transparent',
              'line-width': 24,
              'line-opacity': 0,
            }}
          />
          {/* Dark casing for contrast against satellite imagery */}
          <Layer
            id="task-segments-casing"
            type="line"
            paint={{
              'line-color': '#000000',
              'line-width': ['+', ['get', 'width'], 4],
              'line-opacity': [
                'case',
                ['get', 'is_complete'],
                0.25,
                0.6,
              ],
            }}
          />
          {/* Segment lines */}
          <Layer
            id="task-segments-line"
            type="line"
            paint={{
              'line-color': ['get', 'color'],
              'line-width': [
                'case',
                ['get', 'selected'],
                ['*', ['get', 'width'], 2],
                ['get', 'width'],
              ],
              'line-opacity': [
                'case',
                ['get', 'is_complete'],
                0.4,
                1,
              ],
            }}
          />
          {/* Selection halo */}
          <Layer
            id="task-segments-halo"
            type="line"
            filter={['==', ['get', 'selected'], true]}
            paint={{
              'line-color': '#3B82F6',
              'line-width': ['+', ['get', 'width'], 10],
              'line-opacity': 0.4,
            }}
          />
          {/* Completion checkmarks as circles at midpoint */}
          <Layer
            id="task-segments-complete-overlay"
            type="line"
            filter={['==', ['get', 'is_complete'], true]}
            paint={{
              'line-color': '#22C55E',
              'line-width': 2,
              'line-dasharray': [2, 4],
            }}
          />
          {/* Road name labels — appear when zoomed in */}
          <Layer
            id="task-segments-label"
            type="symbol"
            filter={['!=', ['get', 'name'], '']}
            minzoom={14}
            layout={{
              'symbol-placement': 'line-center',
              'text-field': ['get', 'name'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 14, 12, 18, 16],
              'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
              'text-anchor': 'center',
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            }}
            paint={{
              'text-color': '#FFFFFF',
              'text-halo-color': '#000000',
              'text-halo-width': 2,
            }}
          />
        </Source>

        <GeolocateControl
          ref={geolocateRef}
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation
          showUserHeading
          position="top-right"
        />
      </Map>

      {/* Back button + place name + list toggle */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <Link
          href={`/tasks/${taskId}`}
          className="p-2 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        {placeName && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
              {placeName}
            </span>
          </div>
        )}
        <button
          onClick={() => setShowList(!showList)}
          className="p-2 bg-card/95 backdrop-blur rounded-lg shadow-lg border border-border text-foreground"
          title={showList ? 'Show map' : 'Show segment list'}
        >
          {showList ? <MapIcon className="w-5 h-5" /> : <List className="w-5 h-5" />}
        </button>
      </div>

      {/* Segment list panel */}
      {showList && (
        <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur overflow-y-auto pb-24">
          <div className="pt-16 px-4">
            <h2 className="text-lg font-semibold text-foreground mb-1">Segments</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {totalCount} segments &middot; {formatLength(
                assignments.reduce((sum, a) => sum + segmentLengthFeet(a.segment.geometry.coordinates), 0)
              )} total
            </p>
            <div className="space-y-2">
              {assignments.map((a) => {
                const length = segmentLengthFeet(a.segment.geometry.coordinates);
                const config = STRIPE_TYPE_CONFIG[a.segment.stripe_type as StripeType];
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedId(a.id);
                      setShowList(false);
                      // Fly to this segment
                      const coords = a.segment.geometry.coordinates;
                      const midIdx = Math.floor(coords.length / 2);
                      mapRef.current?.flyTo({
                        center: coords[midIdx],
                        zoom: 17,
                        duration: 1000,
                      });
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      a.is_complete
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40'
                        : 'bg-card border-border hover:bg-muted/50'
                    }`}
                  >
                    {/* Color indicator */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {a.segment.stripe_type === 'yellow_and_white' ? (
                        <>
                          <span className="w-8 h-1.5 rounded-full" style={{ backgroundColor: '#FFD600' }} />
                          <span className="w-8 h-1.5 rounded-full" style={{ backgroundColor: '#FFFFFF', border: '1px solid #e5e7eb' }} />
                        </>
                      ) : (
                        <span
                          className="w-8 h-1.5 rounded-full"
                          style={{
                            backgroundColor: config?.color ?? '#888',
                            border: config?.color === '#FFFFFF' ? '1px solid #e5e7eb' : undefined,
                          }}
                        />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {a.segment.name || 'Unnamed segment'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config?.label} &middot; {formatLength(length)}
                      </p>
                    </div>

                    {/* Status */}
                    {a.is_complete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border safe-area-pb">
        {/* Selected segment bottom sheet */}
        {selectedAssignment && (
          <div className="p-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {selectedAssignment.segment.name && (
                  <p className="font-medium text-foreground">
                    {selectedAssignment.segment.name}
                  </p>
                )}
                <p className={`${selectedAssignment.segment.name ? 'text-sm text-muted-foreground' : 'font-medium text-foreground'}`}>
                  {STRIPE_TYPE_CONFIG[selectedAssignment.segment.stripe_type as StripeType]?.label ?? selectedAssignment.segment.stripe_type}
                </p>
                {selectedAssignment.segment.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedAssignment.segment.notes}
                  </p>
                )}
                {selectedAssignment.segment.attributes && (() => {
                  const attrs = selectedAssignment.segment.attributes as Record<string, unknown>;
                  return (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {attrs.width_inches ? (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {String(attrs.width_inches)}&quot; wide
                        </span>
                      ) : null}
                      {attrs.reflective ? (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">Reflective</span>
                      ) : null}
                      {attrs.paint_type ? (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded">
                          {String(attrs.paint_type)}
                        </span>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                    selectedAssignment.is_complete
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {selectedAssignment.is_complete ? (
                    <><CheckCircle2 className="w-4 h-4" /> Done</>
                  ) : (
                    <><Circle className="w-4 h-4" /> Mark Done</>
                  )}
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress summary */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {completedCount} of {totalCount} segments complete
            </span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
