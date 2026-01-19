'use client';

import { useState } from 'react';
import type { Checklist } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

interface ChecklistFormData {
  name: string;
  description: string | null;
  order: number;
}

interface ChecklistFormProps {
  checklist?: Checklist | null;
  nextOrder?: number;
  onSubmit: (data: ChecklistFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ChecklistForm({
  checklist,
  nextOrder = 0,
  onSubmit,
  onCancel,
  isLoading,
}: ChecklistFormProps) {
  const [name, setName] = useState(checklist?.name || '');
  const [description, setDescription] = useState(checklist?.description || '');
  const [order, setOrder] = useState(checklist?.order ?? nextOrder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      description: description.trim() || null,
      order,
    });
    if (!checklist) {
      // Reset form after creating new checklist
      setName('');
      setDescription('');
      setOrder(nextOrder + 1);
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
          placeholder="e.g., Safety Inspection, Quality Check"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description for this checklist"
          rows={2}
        />
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

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Saving...
            </>
          ) : checklist ? (
            'Update Checklist'
          ) : (
            'Create Checklist'
          )}
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
