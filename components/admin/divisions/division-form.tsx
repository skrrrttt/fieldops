'use client';

import { useState } from 'react';
import type { Division } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

// Common icons for divisions
const ICON_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'truck', label: 'Truck' },
  { value: 'building', label: 'Building' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'water', label: 'Water' },
  { value: 'tree', label: 'Tree' },
  { value: 'gear', label: 'Gear' },
  { value: 'hammer', label: 'Hammer' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'phone', label: 'Phone' },
];

interface DivisionFormProps {
  division?: Division | null;
  onSubmit: (data: { name: string; color: string; icon: string | null }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function DivisionForm({ division, onSubmit, onCancel, isLoading }: DivisionFormProps) {
  const [name, setName] = useState(division?.name || '');
  const [color, setColor] = useState(division?.color || '#3b82f6');
  const [icon, setIcon] = useState(division?.icon || 'none');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ name, color, icon: icon === 'none' ? null : icon });
    if (!division) {
      // Reset form after creating new division
      setName('');
      setColor('#3b82f6');
      setIcon('none');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g., Electrical, Plumbing, HVAC"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="color">Color</Label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded border border-input bg-background"
          />
          <Input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 font-mono text-sm"
            placeholder="#3b82f6"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon">Icon (optional)</Label>
        <Select value={icon} onValueChange={setIcon}>
          <SelectTrigger>
            <SelectValue placeholder="Select an icon" />
          </SelectTrigger>
          <SelectContent>
            {ICON_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Saving...
            </>
          ) : division ? 'Update Division' : 'Create Division'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
