/**
 * Types and configuration for Striping Maps feature
 */

export type StripeType =
  | 'yellow_centerline'
  | 'white_edge_line'
  | 'double_yellow'
  | 'dashed_white'
  | 'yellow_and_white';

export interface StripeTypeConfig {
  label: string;
  color: string;
  dashArray?: number[];
  width: number;
}

export const STRIPE_TYPE_CONFIG: Record<StripeType, StripeTypeConfig> = {
  yellow_centerline: {
    label: 'Yellow Centerline',
    color: '#FFD600',
    width: 4,
  },
  white_edge_line: {
    label: 'White Edge Line',
    color: '#FFFFFF',
    width: 3,
  },
  double_yellow: {
    label: 'Double Yellow',
    color: '#FFD600',
    width: 6,
  },
  dashed_white: {
    label: 'Dashed White',
    color: '#FFFFFF',
    dashArray: [8, 6],
    width: 3,
  },
  yellow_and_white: {
    label: 'Yellow & White',
    color: '#FFD600',
    width: 5,
  },
};

export const STRIPE_TYPES = Object.keys(STRIPE_TYPE_CONFIG) as StripeType[];

export interface SegmentAttributes {
  width_inches?: number;
  line_style?: string;
  reflective?: boolean;
  paint_type?: string;
}

export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface StripingMap {
  id: string;
  name: string;
  description: string | null;
  center_lng: number | null;
  center_lat: number | null;
  zoom: number | null;
  version_label: string | null;
  cloned_from_id: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StripingSegment {
  id: string;
  map_id: string;
  geometry: GeoJSONLineString;
  stripe_type: StripeType;
  attributes: SegmentAttributes | null;
  notes: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskSegmentAssignment {
  id: string;
  task_id: string;
  segment_id: string;
  is_complete: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export interface StripingMapWithSegments extends StripingMap {
  segments: StripingSegment[];
}

export interface TaskSegmentAssignmentWithSegment extends TaskSegmentAssignment {
  segment: StripingSegment;
}

export type DrawMode = 'select' | 'snap_draw' | 'freeform_draw';
