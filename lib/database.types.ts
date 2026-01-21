/**
 * Database types for FieldOps application
 * These types mirror the Supabase database schema
 */

export type UserRole = 'admin' | 'field_user';

export type FieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          is_active: boolean;
          last_active_at: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: UserRole;
          is_active?: boolean;
          last_active_at?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          is_active?: boolean;
          last_active_at?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      divisions: {
        Row: {
          id: string;
          name: string;
          color: string;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          icon?: string | null;
          created_at?: string;
        };
      };
      statuses: {
        Row: {
          id: string;
          name: string;
          color: string;
          order: number;
          is_complete: boolean;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color?: string;
          order?: number;
          is_complete?: boolean;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          order?: number;
          is_complete?: boolean;
          is_default?: boolean;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          contact_phone: string | null;
          contact_email: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_phone?: string | null;
          contact_email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_phone?: string | null;
          contact_email?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      jobs: {
        Row: {
          id: string;
          customer_id: string;
          name: string;
          address: string | null;
          location_lat: number | null;
          location_lng: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          name: string;
          address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          name?: string;
          address?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          specifications: string | null;
          status_id: string;
          division_id: string | null;
          job_id: string | null;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
          start_date: string | null;
          end_date: string | null;
          assigned_user_id: string | null;
          custom_fields: Record<string, unknown> | null;
          assigned_field_ids: string[] | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          specifications?: string | null;
          status_id: string;
          division_id?: string | null;
          job_id?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          assigned_user_id?: string | null;
          custom_fields?: Record<string, unknown> | null;
          assigned_field_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          specifications?: string | null;
          status_id?: string;
          division_id?: string | null;
          job_id?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          assigned_user_id?: string | null;
          custom_fields?: Record<string, unknown> | null;
          assigned_field_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      comments: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          content?: string;
          created_at?: string;
        };
      };
      photos: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          storage_path: string;
          timestamp: string;
          gps_lat: number | null;
          gps_lng: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          storage_path: string;
          timestamp?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          storage_path?: string;
          timestamp?: string;
          gps_lat?: number | null;
          gps_lng?: number | null;
          created_at?: string;
        };
      };
      files: {
        Row: {
          id: string;
          task_id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          storage_path: string;
          file_name: string;
          file_size: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          storage_path?: string;
          file_name?: string;
          file_size?: number;
          created_at?: string;
        };
      };
      custom_field_definitions: {
        Row: {
          id: string;
          name: string;
          field_type: FieldType;
          options: string[] | null;
          required: boolean;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          field_type: FieldType;
          options?: string[] | null;
          required?: boolean;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          field_type?: FieldType;
          options?: string[] | null;
          required?: boolean;
          order?: number;
          created_at?: string;
        };
      };
      branding: {
        Row: {
          id: string;
          logo_url: string | null;
          primary_color: string;
          accent_color: string;
          app_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          logo_url?: string | null;
          primary_color?: string;
          accent_color?: string;
          app_name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          logo_url?: string | null;
          primary_color?: string;
          accent_color?: string;
          app_name?: string;
          created_at?: string;
        };
      };
      task_history: {
        Row: {
          id: string;
          original_task_id: string;
          title: string;
          description: string | null;
          specifications: string | null;
          status_name: string;
          status_color: string | null;
          division_name: string | null;
          division_color: string | null;
          assigned_user_id: string | null;
          assigned_user_email: string | null;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
          custom_fields: Record<string, unknown> | null;
          start_date: string | null;
          end_date: string | null;
          task_created_at: string;
          completed_at: string;
          completed_by: string | null;
          duration_minutes: number | null;
          photos_count: number;
          comments_count: number;
          files_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          original_task_id: string;
          title: string;
          description?: string | null;
          specifications?: string | null;
          status_name: string;
          status_color?: string | null;
          division_name?: string | null;
          division_color?: string | null;
          assigned_user_id?: string | null;
          assigned_user_email?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          custom_fields?: Record<string, unknown> | null;
          start_date?: string | null;
          end_date?: string | null;
          task_created_at: string;
          completed_at?: string;
          completed_by?: string | null;
          duration_minutes?: number | null;
          photos_count?: number;
          comments_count?: number;
          files_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          original_task_id?: string;
          title?: string;
          description?: string | null;
          specifications?: string | null;
          status_name?: string;
          status_color?: string | null;
          division_name?: string | null;
          division_color?: string | null;
          assigned_user_id?: string | null;
          assigned_user_email?: string | null;
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          custom_fields?: Record<string, unknown> | null;
          start_date?: string | null;
          end_date?: string | null;
          task_created_at?: string;
          completed_at?: string;
          completed_by?: string | null;
          duration_minutes?: number | null;
          photos_count?: number;
          comments_count?: number;
          files_count?: number;
          created_at?: string;
        };
      };
      checklists: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          order?: number;
          created_at?: string;
        };
      };
      checklist_items: {
        Row: {
          id: string;
          checklist_id: string;
          title: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          checklist_id: string;
          title: string;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          checklist_id?: string;
          title?: string;
          order?: number;
          created_at?: string;
        };
      };
      task_checklists: {
        Row: {
          id: string;
          task_id: string;
          checklist_id: string;
          item_completions: Record<string, boolean>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          checklist_id: string;
          item_completions?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          checklist_id?: string;
          item_completions?: Record<string, boolean>;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Convenience types for accessing table rows
export type User = Database['public']['Tables']['users']['Row'];
export type Division = Database['public']['Tables']['divisions']['Row'];
export type Status = Database['public']['Tables']['statuses']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type File = Database['public']['Tables']['files']['Row'];
export type CustomFieldDefinition = Database['public']['Tables']['custom_field_definitions']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Job = Database['public']['Tables']['jobs']['Row'];
export type Branding = Database['public']['Tables']['branding']['Row'];
export type TaskHistory = Database['public']['Tables']['task_history']['Row'];
export type Checklist = Database['public']['Tables']['checklists']['Row'];
export type ChecklistItem = Database['public']['Tables']['checklist_items']['Row'];
export type TaskChecklist = Database['public']['Tables']['task_checklists']['Row'];

// Extended types with relations for Customer/Job CRM
export interface JobWithCustomer extends Job {
  customer: Customer;
}

export interface CustomerWithJobs extends Customer {
  jobs: Job[];
}

// Extended types with relations
export interface ChecklistWithItems extends Checklist {
  items: ChecklistItem[];
}

export interface TaskChecklistWithDetails extends TaskChecklist {
  checklist: ChecklistWithItems;
}

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type DivisionInsert = Database['public']['Tables']['divisions']['Insert'];
export type StatusInsert = Database['public']['Tables']['statuses']['Insert'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type PhotoInsert = Database['public']['Tables']['photos']['Insert'];
export type FileInsert = Database['public']['Tables']['files']['Insert'];
export type CustomFieldDefinitionInsert = Database['public']['Tables']['custom_field_definitions']['Insert'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type JobInsert = Database['public']['Tables']['jobs']['Insert'];
export type BrandingInsert = Database['public']['Tables']['branding']['Insert'];
export type TaskHistoryInsert = Database['public']['Tables']['task_history']['Insert'];
export type ChecklistInsert = Database['public']['Tables']['checklists']['Insert'];
export type ChecklistItemInsert = Database['public']['Tables']['checklist_items']['Insert'];
export type TaskChecklistInsert = Database['public']['Tables']['task_checklists']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type DivisionUpdate = Database['public']['Tables']['divisions']['Update'];
export type StatusUpdate = Database['public']['Tables']['statuses']['Update'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
export type PhotoUpdate = Database['public']['Tables']['photos']['Update'];
export type FileUpdate = Database['public']['Tables']['files']['Update'];
export type CustomFieldDefinitionUpdate = Database['public']['Tables']['custom_field_definitions']['Update'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];
export type JobUpdate = Database['public']['Tables']['jobs']['Update'];
export type BrandingUpdate = Database['public']['Tables']['branding']['Update'];
export type TaskHistoryUpdate = Database['public']['Tables']['task_history']['Update'];
export type ChecklistUpdate = Database['public']['Tables']['checklists']['Update'];
export type ChecklistItemUpdate = Database['public']['Tables']['checklist_items']['Update'];
export type TaskChecklistUpdate = Database['public']['Tables']['task_checklists']['Update'];
