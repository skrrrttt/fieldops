'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export interface JobFormData {
  name: string;
  address: string;
  location_lat: string;
  location_lng: string;
  notes: string;
}

interface JobFormProps {
  data: JobFormData;
  onChange: (data: JobFormData) => void;
  disabled?: boolean;
}

export function JobForm({ data, onChange, disabled = false }: JobFormProps) {
  const handleChange = (field: keyof JobFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ ...data, [field]: e.target.value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="job-name">
          Job Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="job-name"
          value={data.name}
          onChange={handleChange('name')}
          placeholder="e.g., Main Office, Warehouse #2"
          disabled={disabled}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-address">Job Address</Label>
        <Input
          id="job-address"
          value={data.address}
          onChange={handleChange('address')}
          placeholder="123 Work Site Ave, City, State ZIP"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="job-lat">Latitude</Label>
          <Input
            id="job-lat"
            type="number"
            step="any"
            value={data.location_lat}
            onChange={handleChange('location_lat')}
            placeholder="40.7128"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="job-lng">Longitude</Label>
          <Input
            id="job-lng"
            type="number"
            step="any"
            value={data.location_lng}
            onChange={handleChange('location_lng')}
            placeholder="-74.0060"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job-notes">Notes</Label>
        <Textarea
          id="job-notes"
          value={data.notes}
          onChange={handleChange('notes')}
          placeholder="Any notes about this job site..."
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
