import { getChecklistsWithItems, getNextChecklistOrder } from '@/lib/checklists/actions';
import { CreateChecklistForm } from '@/components/admin/checklists/create-checklist-form';
import { ChecklistList } from '@/components/admin/checklists/checklist-list';

export default async function AdminChecklistsPage() {
  const [checklists, nextOrder] = await Promise.all([
    getChecklistsWithItems(),
    getNextChecklistOrder(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Checklists
        </h1>
        <p className="text-muted-foreground mt-1">
          Create reusable checklists that can be attached to tasks. Field users can check off items as they complete them.
        </p>
      </div>

      {/* Create Checklist Form */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Create New Checklist
        </h3>
        <CreateChecklistForm nextOrder={nextOrder} />
      </div>

      {/* Existing Checklists List */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Existing Checklists ({checklists.length})
        </h3>
        <ChecklistList checklists={checklists} />
      </div>
    </div>
  );
}
