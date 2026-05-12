// Hand-rolled to match supabase/migrations/0001_schema.sql + 0004 RPCs.
// Regenerate with `supabase gen types typescript --linked` once the project
// is linked; this file is the contract until then.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SetType = "top_set" | "backoff" | "normal";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      exercise_splits: {
        Row: { id: string; name: string };
        Insert: { id: string; name: string };
        Update: { id?: string; name?: string };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          name: string;
          split_id: string;
          day: number;
          order_index: number;
          notes: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          split_id: string;
          day: number;
          order_index: number;
          notes?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          split_id?: string;
          day?: number;
          order_index?: number;
          notes?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      exercise_set_templates: {
        Row: {
          id: string;
          exercise_id: string;
          type: SetType;
          order_index: number;
          target_reps_min: number;
          target_reps_max: number;
          default_sets: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          exercise_id: string;
          type: SetType;
          order_index: number;
          target_reps_min: number;
          target_reps_max: number;
          default_sets: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          exercise_id?: string;
          type?: SetType;
          order_index?: number;
          target_reps_min?: number;
          target_reps_max?: number;
          default_sets?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          split_id: string;
          day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          split_id: string;
          day: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          split_id?: string;
          day?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_exercises: {
        Row: {
          id: string;
          workout_id: string;
          exercise_id: string;
          order_index: number;
        };
        Insert: {
          id?: string;
          workout_id: string;
          exercise_id: string;
          order_index: number;
        };
        Update: {
          id?: string;
          workout_id?: string;
          exercise_id?: string;
          order_index?: number;
        };
        Relationships: [];
      };
      sets: {
        Row: {
          id: string;
          workout_exercise_id: string;
          set_template_id: string | null;
          order_index: number;
          reps: number | null;
          weight: number | null;
          is_skipped: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workout_exercise_id: string;
          set_template_id?: string | null;
          order_index: number;
          reps?: number | null;
          weight?: number | null;
          is_skipped?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workout_exercise_id?: string;
          set_template_id?: string | null;
          order_index?: number;
          reps?: number | null;
          weight?: number | null;
          is_skipped?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      save_workout: {
        Args: { p_day: number; p_exercises: Json };
        Returns: string;
      };
      update_workout_sets: {
        Args: { p_workout_id: string; p_sets: Json };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
