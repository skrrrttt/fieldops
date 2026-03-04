import { getDivisions } from '@/lib/divisions/actions';
import { CreateDivisionForm } from '@/components/admin/divisions/create-division-form';
import { DivisionList } from '@/components/admin/divisions/division-list';

export default async function AdminDivisionsPage() {
  const divisions = await getDivisions();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Divisions
        </h1>
        <p className="text-muted-foreground mt-1">
          Create and manage divisions or flags to categorize tasks.
        </p>
      </div>

      {/* Create Division Form */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Create New Division
        </h3>
        <CreateDivisionForm />
      </div>

      {/* Existing Divisions List */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Existing Divisions ({divisions.length})
        </h3>
        <DivisionList divisions={divisions} />
      </div>
    </div>
  );
}
