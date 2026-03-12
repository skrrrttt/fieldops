import { MapCreateForm } from '@/components/admin/maps/map-create-form';

export default function NewMapPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create Striping Map</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new map plan for road striping.
        </p>
      </div>

      <MapCreateForm />
    </div>
  );
}
