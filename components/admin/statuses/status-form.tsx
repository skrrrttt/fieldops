'use client';

import { useState } from 'react';
import type { Status } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

interface StatusFormData {
  name: string;
  color: string;
  order: number;
  is_complete: boolean;
  is_default: boolean;
}

interface StatusFormProps {
  status?: Status | null;
  nextOrder?: number;
  onSubmit: (data: StatusFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function StatusForm({ status, nextOrder = 0, onSubmit, onCancel, isLoading }: StatusFormProps) {
  const [name, setName] = useState(status?.name || '');
  const [color, setColor] = useState(status?.color || '#3b82f6');
  const [order, setOrder] = useState(status?.order ?? nextOrder);
  const [isComplete, setIsComplete] = useState(status?.is_complete || false);
  const [isDefault, setIsDefault] = useState(status?.is_default || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      color,
      order,
      is_complete: isComplete,
      is_default: isDefault,
    });
    if (!status) {
      // Reset form after creating new status
      setName('');
      setColor('#3b82f6');
      setOrder(nextOrder + 1);
      setIsComplete(false);
      setIsDefault(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g., In Progress, Completed, On Hold"
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="order">Order</Label>
        <Input
          id="order"
          type="number"
          value={order}
          onChange={(e) => setOrder(parseInt(e.target.value, 10) || 0)}
          min={0}
          className="w-32"
        />
        <p className="text-sm text-muted-foreground">
          Lower numbers appear first. You can also drag to reorder.
        </p>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="is_complete"
            checked={isComplete}
            onCheckedChange={(checked) => setIsComplete(checked as boolean)}
          />
          <Label htmlFor="is_complete" className="font-normal cursor-pointer">
            Mark as Complete
          </Label>
          <span className="text-sm text-muted-foreground">(affects reporting)</span>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="is_default"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
          />
          <Label htmlFor="is_default" className="font-normal cursor-pointer">
            Default Status
          </Label>
          <span className="text-sm text-muted-foreground">(for new tasks)</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Saving...
            </>
          ) : status ? 'Update Status' : 'Create Status'}
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
