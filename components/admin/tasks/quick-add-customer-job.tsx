'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Customer, JobWithCustomer } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building2, Plus } from 'lucide-react';
import { createCustomer, createJob, getJob } from '@/lib/customers/actions';

interface QuickAddCustomerJobProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: JobWithCustomer) => void;
  existingCustomers: Customer[];
}

export function QuickAddCustomerJob({
  isOpen,
  onClose,
  onJobCreated,
  existingCustomers,
}: QuickAddCustomerJobProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<'customer' | 'job'>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer selection
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('new');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // New customer form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Job form
  const [jobName, setJobName] = useState('');
  const [jobAddress, setJobAddress] = useState('');
  const [jobNotes, setJobNotes] = useState('');

  // Created customer for step 2
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);

  const resetForm = () => {
    setStep('customer');
    setCustomerMode('new');
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setJobName('');
    setJobAddress('');
    setJobNotes('');
    setCreatedCustomer(null);
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (customerMode === 'existing') {
      if (!selectedCustomerId) {
        setError('Please select a customer');
        return;
      }
      // Find the selected customer
      const customer = existingCustomers.find((c) => c.id === selectedCustomerId);
      if (customer) {
        setCreatedCustomer(customer);
        setStep('job');
      }
      return;
    }

    // Creating new customer
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createCustomer({
        name: customerName.trim(),
        contact_phone: customerPhone.trim() || null,
        contact_email: customerEmail.trim() || null,
      });

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to create customer');
        return;
      }

      setCreatedCustomer(result.data);
      setStep('job');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!createdCustomer) {
      setError('No customer selected');
      return;
    }

    if (!jobName.trim()) {
      setError('Job name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createJob({
        customer_id: createdCustomer.id,
        name: jobName.trim(),
        address: jobAddress.trim() || null,
        notes: jobNotes.trim() || null,
      });

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to create job');
        return;
      }

      // Fetch the full job with customer data
      const fullJob = await getJob(result.data.id);
      if (fullJob) {
        onJobCreated(fullJob);
      }

      // Refresh the page to update the jobs list
      startTransition(() => {
        router.refresh();
      });

      resetForm();
      onClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'customer' ? 'Step 1: Select or Create Customer' : 'Step 2: Create Job'}
          </DialogTitle>
        </DialogHeader>

        {step === 'customer' ? (
          <form onSubmit={handleCustomerSubmit}>
            <div className="py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Customer mode toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={customerMode === 'new' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerMode('new')}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New Customer
                </Button>
                <Button
                  type="button"
                  variant={customerMode === 'existing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCustomerMode('existing')}
                  disabled={isSubmitting || existingCustomers.length === 0}
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  Existing Customer
                </Button>
              </div>

              {customerMode === 'existing' ? (
                <div className="space-y-2">
                  <Label>Select Customer</Label>
                  <Select
                    value={selectedCustomerId}
                    onValueChange={setSelectedCustomerId}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="quick-customer-name">
                      Customer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="quick-customer-name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quick-customer-phone">Phone</Label>
                      <Input
                        id="quick-customer-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quick-customer-email">Email</Label>
                      <Input
                        id="quick-customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="contact@example.com"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Creating...
                  </>
                ) : (
                  'Next: Create Job'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={handleJobSubmit}>
            <div className="py-4 space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Show selected customer */}
              <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm text-zinc-500">Customer</div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {createdCustomer?.name}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  onClick={() => setStep('customer')}
                  disabled={isSubmitting}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-job-name">
                  Job Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quick-job-name"
                  value={jobName}
                  onChange={(e) => setJobName(e.target.value)}
                  placeholder="e.g., Main Office, Warehouse #2"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-job-address">Job Address</Label>
                <Input
                  id="quick-job-address"
                  value={jobAddress}
                  onChange={(e) => setJobAddress(e.target.value)}
                  placeholder="123 Work Site Ave, City, State ZIP"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  This address will be auto-filled when creating tasks for this job.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quick-job-notes">Notes</Label>
                <Textarea
                  id="quick-job-notes"
                  value={jobNotes}
                  onChange={(e) => setJobNotes(e.target.value)}
                  placeholder="Any notes about this job site..."
                  rows={2}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('customer')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Creating...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
