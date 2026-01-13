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
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          specifications: string | null;
          status_id: string;
          division_id: string | null;
          location_lat: number | null;
          location_lng: number | null;
          address: string | null;
          due_date: string | null;
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
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          due_date?: string | null;
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
          location_lat?: number | null;
          location_lng?: number | null;
          address?: string | null;
          due_date?: string | null;
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
      task_templates: {
        Row: {
          id: string;
          name: string;
          default_title: string | null;
          default_description: string | null;
          default_division_id: string | null;
          default_custom_fields: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          default_title?: string | null;
          default_description?: string | null;
          default_division_id?: string | null;
          default_custom_fields?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          default_title?: string | null;
          default_description?: string | null;
          default_division_id?: string | null;
          default_custom_fields?: Record<string, unknown> | null;
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
export type TaskTemplate = Database['public']['Tables']['task_templates']['Row'];
export type Branding = Database['public']['Tables']['branding']['Row'];

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type DivisionInsert = Database['public']['Tables']['divisions']['Insert'];
export type StatusInsert = Database['public']['Tables']['statuses']['Insert'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type CommentInsert = Database['public']['Tables']['comments']['Insert'];
export type PhotoInsert = Database['public']['Tables']['photos']['Insert'];
export type FileInsert = Database['public']['Tables']['files']['Insert'];
export type CustomFieldDefinitionInsert = Database['public']['Tables']['custom_field_definitions']['Insert'];
export type TaskTemplateInsert = Database['public']['Tables']['task_templates']['Insert'];
export type BrandingInsert = Database['public']['Tables']['branding']['Insert'];

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type DivisionUpdate = Database['public']['Tables']['divisions']['Update'];
export type StatusUpdate = Database['public']['Tables']['statuses']['Update'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];
export type CommentUpdate = Database['public']['Tables']['comments']['Update'];
export type PhotoUpdate = Database['public']['Tables']['photos']['Update'];
export type FileUpdate = Database['public']['Tables']['files']['Update'];
export type CustomFieldDefinitionUpdate = Database['public']['Tables']['custom_field_definitions']['Update'];
export type TaskTemplateUpdate = Database['public']['Tables']['task_templates']['Update'];
export type BrandingUpdate = Database['public']['Tables']['branding']['Update'];
