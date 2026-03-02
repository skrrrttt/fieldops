import { getUsers } from '@/lib/users/actions';
import { UserTable } from '@/components/admin/users/user-table';
import { createClient } from '@/lib/supabase/server';

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const [{ data: { user } }, users] = await Promise.all([
    supabase.auth.getUser(),
    getUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          User Management
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Manage users, invite new team members, and control access.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
        <UserTable users={users} currentUserId={user?.id ?? ''} />
      </div>
    </div>
  );
}
