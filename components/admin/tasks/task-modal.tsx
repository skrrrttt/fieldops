'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { TaskWithRelations } from '@/lib/tasks/actions';
import type { Status, Division, User, CustomFieldDefinition, TaskTemplate } from '@/lib/database.types';
import { createTask, updateTask, deleteTask } from '@/lib/tasks/actions';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskMediaPanel } from './task-media-panel';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: TaskWithRelations | null;
  statuses: Status[];
  divisions: Division[];
  users: User[];
  defaultStatusId: string | null;
  customFields: CustomFieldDefinition[];
  templates?: TaskTemplate[];
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  statuses,
  divisions,
  users,
  defaultStatusId,
  customFields,
  templates = [],
}: TaskModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customFieldErrors, setCustomFieldErrors] = useState<Record<string, string>>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const isEditing = !!task;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status_id: defaultStatusId || '',
    division_id: '',
    assigned_user_id: '',
    due_date: '',
    address: '',
    location_lat: '',
    location_lng: '',
  });

  // Custom fields form state - keyed by field ID
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  // Initialize custom field default values
  const getDefaultCustomFieldValues = () => {
    const defaults: Record<string, unknown> = {};
    customFields.forEach((field) => {
      switch (field.field_type) {
        case 'checkbox':
          defaults[field.id] = false;
          break;
        case 'text':
        case 'number':
        case 'date':
        case 'dropdown':
        default:
          defaults[field.id] = '';
          break;
      }
    });
    return defaults;
  };

  // Handle template selection - pre-fill form with template defaults
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);

    if (!templateId) {
      // Reset to defaults when "No template" is selected
      setFormData({
        title: '',
        description: '',
        status_id: defaultStatusId || (statuses.length > 0 ? statuses[0].id : ''),
        division_id: '',
        assigned_user_id: '',
        due_date: '',
        address: '',
        location_lat: '',
        location_lng: '',
      });
      setCustomFieldValues(getDefaultCustomFieldValues());
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Pre-fill form data from template
    setFormData((prev) => ({
      ...prev,
      title: template.default_title || '',
      description: template.default_description || '',
      division_id: template.default_division_id || '',
      // Keep status, assigned user, due date, and location unchanged (user must set these)
    }));

    // Pre-fill custom field values from template
    if (template.default_custom_fields) {
      const templateCustomFields: Record<string, unknown> = {};
      customFields.forEach((field) => {
        const templateValue = template.default_custom_fields?.[field.id];
        if (templateValue !== undefined) {
          templateCustomFields[field.id] = templateValue;
        } else {
          // Use default for fields not in template
          switch (field.field_type) {
            case 'checkbox':
              templateCustomFields[field.id] = false;
              break;
            default:
              templateCustomFields[field.id] = '';
          }
        }
      });
      setCustomFieldValues(templateCustomFields);
    } else {
      setCustomFieldValues(getDefaultCustomFieldValues());
    }
  };

  // Reset form when task changes or modal opens
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || '',
        status_id: task.status_id,
        division_id: task.division_id || '',
        assigned_user_id: task.assigned_user_id || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        address: task.address || '',
        location_lat: task.location_lat?.toString() || '',
        location_lng: task.location_lng?.toString() || '',
      });
      // Load existing custom field values
      if (task.custom_fields) {
        const existingValues: Record<string, unknown> = {};
        customFields.forEach((field) => {
          // custom_fields is stored with field ID as key
          const value = task.custom_fields?.[field.id];
          if (value !== undefined) {
            existingValues[field.id] = value;
          } else {
            // Set default for missing fields
            switch (field.field_type) {
              case 'checkbox':
                existingValues[field.id] = false;
                break;
              default:
                existingValues[field.id] = '';
            }
          }
        });
        setCustomFieldValues(existingValues);
      } else {
        setCustomFieldValues(getDefaultCustomFieldValues());
      }
    } else {
      setFormData({
        title: '',
        description: '',
        status_id: defaultStatusId || (statuses.length > 0 ? statuses[0].id : ''),
        division_id: '',
        assigned_user_id: '',
        due_date: '',
        address: '',
        location_lat: '',
        location_lng: '',
      });
      setCustomFieldValues(getDefaultCustomFieldValues());
    }
    setError(null);
    setShowDeleteConfirm(false);
    setCustomFieldErrors({});
    setSelectedTemplateId('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, isOpen, defaultStatusId, statuses, customFields]);

  // Validate required custom fields
  const validateCustomFields = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    customFields.forEach((field) => {
      if (field.required) {
        const value = customFieldValues[field.id];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === '' ||
          (field.field_type === 'checkbox' && value === false);

        if (isEmpty) {
          errors[field.id] = `${field.name} is required`;
          isValid = false;
        }
      }
    });

    setCustomFieldErrors(errors);
    return isValid;
  };

  // Update a custom field value
  const updateCustomFieldValue = (fieldId: string, value: unknown) => {
    setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when user starts typing
    if (customFieldErrors[fieldId]) {
      setCustomFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate custom fields
    if (!validateCustomFields()) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Build custom_fields object with only non-empty values
      const customFieldsData: Record<string, unknown> = {};
      customFields.forEach((field) => {
        const value = customFieldValues[field.id];
        // Store all values except empty strings for non-checkbox types
        if (field.field_type === 'checkbox') {
          customFieldsData[field.id] = value;
        } else if (value !== '' && value !== null && value !== undefined) {
          // Convert number strings to actual numbers for number type
          if (field.field_type === 'number' && typeof value === 'string') {
            customFieldsData[field.id] = parseFloat(value);
          } else {
            customFieldsData[field.id] = value;
          }
        }
      });

      const data = {
        title: formData.title,
        description: formData.description || null,
        status_id: formData.status_id,
        division_id: formData.division_id || null,
        assigned_user_id: formData.assigned_user_id || null,
        due_date: formData.due_date || null,
        address: formData.address || null,
        location_lat: formData.location_lat ? parseFloat(formData.location_lat) : null,
        location_lng: formData.location_lng ? parseFloat(formData.location_lng) : null,
        custom_fields: Object.keys(customFieldsData).length > 0 ? customFieldsData : null,
      };

      let result;
      if (isEditing && task) {
        result = await updateTask({ id: task.id, ...data });
      } else {
        result = await createTask(data);
      }

      if (!result.success) {
        setError(result.error || 'An error occurred');
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteTask(task.id);

      if (!result.success) {
        setError(result.error || 'An error occurred');
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Task' : 'Create Task'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 py-4 px-1">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Create from Template - only show in create mode */}
              {!isEditing && templates.length > 0 && (
                <div className="pb-4">
                  <Label>Create from Template</Label>
                  <Select
                    value={selectedTemplateId}
                    onValueChange={handleTemplateSelect}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="No template (start from scratch)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No template (start from scratch)</SelectItem>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTemplateId && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Template values have been applied. You can override any field below.
                    </p>
                  )}
                  <Separator className="mt-4" />
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter task title"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Enter task description"
                />
              </div>

              {/* Status and Division row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div className="space-y-2">
                  <Label>
                    Status <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.status_id}
                    onValueChange={(value) => setFormData({ ...formData, status_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Division */}
                <div className="space-y-2">
                  <Label>Division</Label>
                  <Select
                    value={formData.division_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, division_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No division" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No division</SelectItem>
                      {divisions.map((division) => (
                        <SelectItem key={division.id} value={division.id}>
                          {division.icon ? `${division.icon} ` : ''}{division.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assigned User and Due Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assigned User */}
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select
                    value={formData.assigned_user_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, assigned_user_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Location section */}
              <div className="pt-4">
                <Separator className="mb-4" />
                <h3 className="text-sm font-medium mb-3">Location</h3>

                {/* Address */}
                <div className="space-y-2 mb-4">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter street address"
                  />
                </div>

                {/* Lat/Lng row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location_lat">Latitude</Label>
                    <Input
                      id="location_lat"
                      type="number"
                      step="any"
                      value={formData.location_lat}
                      onChange={(e) => setFormData({ ...formData, location_lat: e.target.value })}
                      placeholder="e.g. 40.7128"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location_lng">Longitude</Label>
                    <Input
                      id="location_lng"
                      type="number"
                      step="any"
                      value={formData.location_lng}
                      onChange={(e) => setFormData({ ...formData, location_lng: e.target.value })}
                      placeholder="e.g. -74.0060"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Fields section */}
              {customFields.length > 0 && (
                <div className="pt-4">
                  <Separator className="mb-4" />
                  <h3 className="text-sm font-medium mb-3">Custom Fields</h3>
                  <div className="space-y-4">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`custom-field-${field.id}`}>
                          {field.name}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>

                        {/* Text input */}
                        {field.field_type === 'text' && (
                          <Input
                            id={`custom-field-${field.id}`}
                            value={(customFieldValues[field.id] as string) || ''}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            className={cn(customFieldErrors[field.id] && 'border-destructive')}
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                          />
                        )}

                        {/* Number input */}
                        {field.field_type === 'number' && (
                          <Input
                            id={`custom-field-${field.id}`}
                            type="number"
                            step="any"
                            value={(customFieldValues[field.id] as string) || ''}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            className={cn(customFieldErrors[field.id] && 'border-destructive')}
                            placeholder={`Enter ${field.name.toLowerCase()}`}
                          />
                        )}

                        {/* Date input */}
                        {field.field_type === 'date' && (
                          <Input
                            id={`custom-field-${field.id}`}
                            type="date"
                            value={(customFieldValues[field.id] as string) || ''}
                            onChange={(e) => updateCustomFieldValue(field.id, e.target.value)}
                            className={cn(customFieldErrors[field.id] && 'border-destructive')}
                          />
                        )}

                        {/* Dropdown input */}
                        {field.field_type === 'dropdown' && (
                          <Select
                            value={(customFieldValues[field.id] as string) || ''}
                            onValueChange={(value) => updateCustomFieldValue(field.id, value)}
                          >
                            <SelectTrigger className={cn(customFieldErrors[field.id] && 'border-destructive')}>
                              <SelectValue placeholder={`Select ${field.name.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Checkbox input */}
                        {field.field_type === 'checkbox' && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`custom-field-${field.id}`}
                              checked={(customFieldValues[field.id] as boolean) || false}
                              onCheckedChange={(checked) => updateCustomFieldValue(field.id, checked)}
                              className={cn(customFieldErrors[field.id] && 'border-destructive')}
                            />
                            <Label
                              htmlFor={`custom-field-${field.id}`}
                              className="text-sm text-muted-foreground font-normal"
                            >
                              Check if applicable
                            </Label>
                          </div>
                        )}

                        {/* Error message */}
                        {customFieldErrors[field.id] && (
                          <p className="text-sm text-destructive">{customFieldErrors[field.id]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments, Photos, Files section - only show when editing */}
              {isEditing && task && (
                <div className="pt-4">
                  <Separator className="mb-4" />
                  <h3 className="text-sm font-medium mb-3">Comments, Photos & Files</h3>
                  <TaskMediaPanel taskId={task.id} />
                </div>
              )}
            </div>

            {/* Footer */}
            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <div className="flex items-center justify-between w-full">
                <div>
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Task
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting || isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isDeleting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        Saving...
                      </>
                    ) : isEditing ? 'Save Changes' : 'Create Task'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
