'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface CustomerFormData {
  name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  notes: string;
}

interface CustomerFormProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  disabled?: boolean;
}

export function CustomerForm({ data, onChange, disabled = false }: CustomerFormProps) {
  const handleChange = (field: keyof CustomerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ ...data, [field]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer-name">
          Customer Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="customer-name"
          value={data.name}
          onChange={handleChange('name')}
          placeholder="Enter customer name"
          disabled={disabled}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Phone</Label>
          <Input
            id="customer-phone"
            type="tel"
            value={data.contact_phone}
            onChange={handleChange('contact_phone')}
            placeholder="(555) 123-4567"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            value={data.contact_email}
            onChange={handleChange('contact_email')}
            placeholder="contact@example.com"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-address">Address</Label>
        <Input
          id="customer-address"
          value={data.address}
          onChange={handleChange('address')}
          placeholder="123 Main St, City, State ZIP"
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-notes">Notes</Label>
        <Textarea
          id="customer-notes"
          value={data.notes}
          onChange={handleChange('notes')}
          placeholder="Any additional notes about this customer..."
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
