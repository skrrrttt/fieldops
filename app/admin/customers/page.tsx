import { requireAdmin } from '@/lib/auth/actions';
import { getCustomersWithJobs } from '@/lib/customers/actions';
import { AdminLayout } from '@/components/admin/admin-layout';
import { CustomerList } from '@/components/admin/customers/customer-list';
import { CreateCustomerForm } from '@/components/admin/customers/create-customer-form';

export default async function AdminCustomersPage() {
  const user = await requireAdmin();
  const customers = await getCustomersWithJobs();

  return (
    <AdminLayout user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Customers & Jobs
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Manage your customers and their job sites. Jobs can be linked to tasks for address auto-fill.
            </p>
          </div>
          <CreateCustomerForm />
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4">
          <CustomerList customers={customers} />
        </div>
      </div>
    </AdminLayout>
  );
}
