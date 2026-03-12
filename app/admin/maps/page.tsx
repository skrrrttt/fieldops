import { getStripingMaps, getMapSegmentCounts } from '@/lib/maps/actions';
import { MapList } from '@/components/admin/maps/map-list';

export default async function AdminMapsPage() {
  const [maps, segmentCounts] = await Promise.all([
    getStripingMaps(),
    getMapSegmentCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Striping Maps</h1>
        <p className="text-muted-foreground mt-1">
          Plan road striping layouts and assign segments to field crew tasks.
        </p>
      </div>

      <MapList maps={maps} segmentCounts={segmentCounts} />
    </div>
  );
}
