'use client';

import { useState } from 'react';
import type { Customer } from '@/lib/database.types';
import { createCustomer } from '@/lib/customers/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface QuickAddCustomerProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function QuickAddCustomer({ isOpen, onClose, onCustomerCreated }: QuickAddCustomerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createCustomer({
        name: name.trim(),
        contact_phone: phone.trim() || null,
        contact_email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error || 'Failed to create customer');
        return;
      }

      if (result.data) {
        onCustomerCreated(result.data);
      }
      handleClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="quick-customer-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="quick-customer-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer name"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-customer-phone">Phone</Label>
              <Input
                id="quick-customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-customer-email">Email</Label>
              <Input
                id="quick-customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-customer-address">Address</Label>
              <Input
                id="quick-customer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-customer-notes">Notes</Label>
              <Textarea
                id="quick-customer-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                rows={2}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                  Creating...
                </>
              ) : (
                'Add Customer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
