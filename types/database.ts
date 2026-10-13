// TypeScript types for the database, in the format `supabase gen types` produces.
// Hand-written from supabase/migrations/ until the server exists; after that,
// `npm run db:types` regenerates (overwrites) this file from the real database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      assessments: {
        Row: {
          completed_at: string | null;
          confidence: string;
          course_id: string;
          created_at: string;
          date_text: string | null;
          due_date: string | null;
          due_time: string | null;
          id: string;
          include_in_calendar: boolean;
          kind: string;
          notes: string | null;
          score_percent: number | null;
          source_quote: string | null;
          status: string;
          syllabus_id: string | null;
          title: string;
          updated_at: string;
          user_id: string;
          weight_percent: number | null;
        };
        Insert: {
          completed_at?: string | null;
          confidence?: string;
          course_id: string;
          created_at?: string;
          date_text?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          include_in_calendar?: boolean;
          kind?: string;
          notes?: string | null;
          score_percent?: number | null;
          source_quote?: string | null;
          status?: string;
          syllabus_id?: string | null;
          title: string;
          updated_at?: string;
          user_id?: string;
          weight_percent?: number | null;
        };
        Update: {
          completed_at?: string | null;
          confidence?: string;
          course_id?: string;
          created_at?: string;
          date_text?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          id?: string;
          include_in_calendar?: boolean;
          kind?: string;
          notes?: string | null;
          score_percent?: number | null;
          source_quote?: string | null;
          status?: string;
          syllabus_id?: string | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
          weight_percent?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_syllabus_id_fkey";
            columns: ["syllabus_id"];
            isOneToOne: false;
            referencedRelation: "syllabi";
            referencedColumns: ["id"];
          },
        ];
      };
      canvas_connections: {
        Row: {
          base_url: string;
          canvas_user_name: string | null;
          created_at: string;
          token_encrypted: string;
          user_id: string;
        };
        Insert: {
          base_url: string;
          canvas_user_name?: string | null;
          created_at?: string;
          token_encrypted: string;
          user_id?: string;
        };
        Update: {
          base_url?: string;
          canvas_user_name?: string | null;
          created_at?: string;
          token_encrypted?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      courses: {
        Row: {
          canvas_course_id: number | null;
          code: string | null;
          color: string | null;
          created_at: string;
          id: string;
          instructor: string | null;
          name: string;
          target_grade: number | null;
          term: string | null;
          term_start_date: string | null;
          user_id: string;
        };
        Insert: {
          canvas_course_id?: number | null;
          code?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          instructor?: string | null;
          name?: string;
          target_grade?: number | null;
          term?: string | null;
          term_start_date?: string | null;
          user_id?: string;
        };
        Update: {
          canvas_course_id?: number | null;
          code?: string | null;
          color?: string | null;
          created_at?: string;
          id?: string;
          instructor?: string | null;
          name?: string;
          target_grade?: number | null;
          term?: string | null;
          term_start_date?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      extraction_runs: {
        Row: {
          cost_usd: number | null;
          created_at: string;
          duration_ms: number | null;
          error_code: string | null;
          id: string;
          input_tokens: number | null;
          model: string;
          output_tokens: number | null;
          succeeded: boolean;
          syllabus_id: string | null;
          user_id: string;
        };
        Insert: {
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          error_code?: string | null;
          id?: string;
          input_tokens?: number | null;
          model: string;
          output_tokens?: number | null;
          succeeded?: boolean;
          syllabus_id?: string | null;
          user_id?: string;
        };
        Update: {
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          error_code?: string | null;
          id?: string;
          input_tokens?: number | null;
          model?: string;
          output_tokens?: number | null;
          succeeded?: boolean;
          syllabus_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "extraction_runs_syllabus_id_fkey";
            columns: ["syllabus_id"];
            isOneToOne: false;
            referencedRelation: "syllabi";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          page: string | null;
          syllabus_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          page?: string | null;
          syllabus_id?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          page?: string | null;
          syllabus_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_syllabus_id_fkey";
            columns: ["syllabus_id"];
            isOneToOne: false;
            referencedRelation: "syllabi";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          calendar_token: string;
          created_at: string;
          id: string;
          timezone: string;
        };
        Insert: {
          calendar_token?: string;
          created_at?: string;
          id: string;
          timezone?: string;
        };
        Update: {
          calendar_token?: string;
          created_at?: string;
          id?: string;
          timezone?: string;
        };
        Relationships: [];
      };
      syllabi: {
        Row: {
          confirmed_at: string | null;
          course_id: string | null;
          created_at: string;
          error_message: string | null;
          extracted_at: string | null;
          extraction_started_at: string | null;
          file_path: string;
          file_sha256: string | null;
          id: string;
          original_filename: string;
          raw_extraction: Json | null;
          status: string;
          user_id: string;
        };
        Insert: {
          confirmed_at?: string | null;
          course_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          extracted_at?: string | null;
          extraction_started_at?: string | null;
          file_path: string;
          file_sha256?: string | null;
          id?: string;
          original_filename: string;
          raw_extraction?: Json | null;
          status?: string;
          user_id?: string;
        };
        Update: {
          confirmed_at?: string | null;
          course_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          extracted_at?: string | null;
          extraction_started_at?: string | null;
          file_path?: string;
          file_sha256?: string | null;
          id?: string;
          original_filename?: string;
          raw_extraction?: Json | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "syllabi_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      begin_extraction: {
        Args: { p_max_per_day: number; p_syllabus_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
