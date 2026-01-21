'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CustomerWithJobs, Job } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Search,
} from 'lucide-react';
import { CustomerForm, type CustomerFormData } from './customer-form';
import { JobForm, type JobFormData } from './job-form';
import {
  updateCustomer,
  deleteCustomer,
  createJob,
  updateJob,
  deleteJob,
} from '@/lib/customers/actions';

interface CustomerListProps {
  customers: CustomerWithJobs[];
}

export function CustomerList({ customers }: CustomerListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  // Edit customer state
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithJobs | null>(null);
  const [customerFormData, setCustomerFormData] = useState<CustomerFormData>({
    name: '',
    contact_phone: '',
    contact_email: '',
    address: '',
    notes: '',
  });
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // Delete customer state
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerWithJobs | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // Add job state
  const [addingJobToCustomer, setAddingJobToCustomer] = useState<CustomerWithJobs | null>(null);
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    name: '',
    address: '',
    location_lat: '',
    location_lng: '',
    notes: '',
  });
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  // Edit job state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editJobFormData, setEditJobFormData] = useState<JobFormData>({
    name: '',
    address: '',
    location_lat: '',
    location_lng: '',
    notes: '',
  });
  const [isEditingJob, setIsEditingJob] = useState(false);
  const [editJobError, setEditJobError] = useState<string | null>(null);

  // Delete job state
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [isDeletingJob, setIsDeletingJob] = useState(false);

  // Filter customers by search
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.contact_email?.toLowerCase().includes(query) ||
      customer.contact_phone?.toLowerCase().includes(query) ||
      customer.jobs.some((job) => job.name.toLowerCase().includes(query))
    );
  });

  const toggleCustomer = (customerId: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  };

  // Customer handlers
  const openEditCustomer = (customer: CustomerWithJobs) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      contact_phone: customer.contact_phone || '',
      contact_email: customer.contact_email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setCustomerError(null);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setIsEditingCustomer(true);
    setCustomerError(null);

    if (!customerFormData.name.trim()) {
      setCustomerError('Customer name is required');
      setIsEditingCustomer(false);
      return;
    }

    try {
      const result = await updateCustomer(editingCustomer.id, {
        name: customerFormData.name.trim(),
        contact_phone: customerFormData.contact_phone.trim() || null,
        contact_email: customerFormData.contact_email.trim() || null,
        address: customerFormData.address.trim() || null,
        notes: customerFormData.notes.trim() || null,
      });

      if (!result.success) {
        setCustomerError(result.error || 'Failed to update customer');
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      setEditingCustomer(null);
    } catch {
      setCustomerError('An unexpected error occurred');
    } finally {
      setIsEditingCustomer(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    setIsDeletingCustomer(true);

    try {
      const result = await deleteCustomer(deletingCustomer.id);

      if (!result.success) {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      setDeletingCustomer(null);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  // Job handlers
  const openAddJob = (customer: CustomerWithJobs) => {
    setAddingJobToCustomer(customer);
    setJobFormData({
      name: '',
      address: '',
      location_lat: '',
      location_lng: '',
      notes: '',
    });
    setJobError(null);
    // Ensure customer is expanded
    setExpandedCustomers((prev) => new Set(prev).add(customer.id));
  };

  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingJobToCustomer) return;

    setIsAddingJob(true);
    setJobError(null);

    if (!jobFormData.name.trim()) {
      setJobError('Job name is required');
      setIsAddingJob(false);
      return;
    }

    try {
      const result = await createJob({
        customer_id: addingJobToCustomer.id,
        name: jobFormData.name.trim(),
        address: jobFormData.address.trim() || null,
        location_lat: jobFormData.location_lat ? parseFloat(jobFormData.location_lat) : null,
        location_lng: jobFormData.location_lng ? parseFloat(jobFormData.location_lng) : null,
        notes: jobFormData.notes.trim() || null,
      });

      if (!result.success) {
        setJobError(result.error || 'Failed to create job');
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      setAddingJobToCustomer(null);
    } catch {
      setJobError('An unexpected error occurred');
    } finally {
      setIsAddingJob(false);
    }
  };

  const openEditJob = (job: Job) => {
    setEditingJob(job);
    setEditJobFormData({
      name: job.name,
      address: job.address || '',
      location_lat: job.location_lat?.toString() || '',
      location_lng: job.location_lng?.toString() || '',
      notes: job.notes || '',
    });
    setEditJobError(null);
  };

  const handleUpdateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    setIsEditingJob(true);
    setEditJobError(null);

    if (!editJobFormData.name.trim()) {
      setEditJobError('Job name is required');
      setIsEditingJob(false);
      return;
    }

    try {
      const result = await updateJob(editingJob.id, {
        name: editJobFormData.name.trim(),
        address: editJobFormData.address.trim() || null,
        location_lat: editJobFormData.location_lat ? parseFloat(editJobFormData.location_lat) : null,
        location_lng: editJobFormData.location_lng ? parseFloat(editJobFormData.location_lng) : null,
        notes: editJobFormData.notes.trim() || null,
      });

      if (!result.success) {
        setEditJobError(result.error || 'Failed to update job');
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      setEditingJob(null);
    } catch {
      setEditJobError('An unexpected error occurred');
    } finally {
      setIsEditingJob(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;

    setIsDeletingJob(true);

    try {
      const result = await deleteJob(deletingJob.id);

      if (!result.success) {
        return;
      }

      startTransition(() => {
        router.refresh();
      });
      setDeletingJob(null);
    } finally {
      setIsDeletingJob(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <Input
          type="text"
          placeholder="Search customers or jobs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          {searchQuery ? 'No customers match your search' : 'No customers yet. Add one to get started.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
            >
              {/* Customer Header */}
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => toggleCustomer(customer.id)}
                  className="flex-shrink-0 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                >
                  {expandedCustomers.has(customer.id) ? (
                    <ChevronDown className="w-5 h-5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                  )}
                </button>

                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-zinc-900 dark:text-white truncate">
                    {customer.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                    {customer.contact_phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {customer.contact_phone}
                      </span>
                    )}
                    {customer.contact_email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {customer.contact_email}
                      </span>
                    )}
                    <span className="text-zinc-400">
                      {customer.jobs.length} job{customer.jobs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAddJob(customer)}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline ml-1">Add Job</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditCustomer(customer)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => setDeletingCustomer(customer)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Jobs List (expanded) */}
              {expandedCustomers.has(customer.id) && (
                <div className="border-t border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                  {customer.jobs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                      No jobs yet. Click &quot;Add Job&quot; to create one.
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-700">
                      {customer.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center gap-3 px-4 py-3 pl-14"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {job.name}
                              </span>
                              {!job.is_active && (
                                <span className="text-xs px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300 rounded">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {job.address && (
                              <p className="text-sm text-zinc-500 truncate">
                                {job.address}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => openEditJob(job)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setDeletingJob(job)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCustomer}>
            <div className="py-4">
              {customerError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{customerError}</AlertDescription>
                </Alert>
              )}
              <CustomerForm
                data={customerFormData}
                onChange={setCustomerFormData}
                disabled={isEditingCustomer}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingCustomer(null)}
                disabled={isEditingCustomer}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingCustomer}>
                {isEditingCustomer ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Confirmation */}
      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCustomer?.name}&quot;? This will also delete all {deletingCustomer?.jobs.length || 0} associated jobs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingCustomer}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={isDeletingCustomer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingCustomer ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Job Dialog */}
      <Dialog open={!!addingJobToCustomer} onOpenChange={() => setAddingJobToCustomer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Job to {addingJobToCustomer?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddJob}>
            <div className="py-4">
              {jobError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{jobError}</AlertDescription>
                </Alert>
              )}
              <JobForm
                data={jobFormData}
                onChange={setJobFormData}
                disabled={isAddingJob}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddingJobToCustomer(null)}
                disabled={isAddingJob}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isAddingJob}>
                {isAddingJob ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Adding...
                  </>
                ) : (
                  'Add Job'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <Dialog open={!!editingJob} onOpenChange={() => setEditingJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateJob}>
            <div className="py-4">
              {editJobError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{editJobError}</AlertDescription>
                </Alert>
              )}
              <JobForm
                data={editJobFormData}
                onChange={setEditJobFormData}
                disabled={isEditingJob}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingJob(null)}
                disabled={isEditingJob}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isEditingJob}>
                {isEditingJob ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Job Confirmation */}
      <AlertDialog open={!!deletingJob} onOpenChange={() => setDeletingJob(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the job &quot;{deletingJob?.name}&quot;? Tasks linked to this job will no longer have a job association. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingJob}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteJob}
              disabled={isDeletingJob}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingJob ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
