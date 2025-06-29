export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          subscription_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          original_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          original_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          file_type?: string
          original_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analyses: {
        Row: {
          id: string
          resume_id: string
          analysis_type: string
          results: Json
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          resume_id: string
          analysis_type: string
          results: Json
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          resume_id?: string
          analysis_type?: string
          results?: Json
          score?: number | null
          created_at?: string
        }
      }
      job_matches: {
        Row: {
          id: string
          resume_id: string
          job_description: string
          match_score: number
          matching_skills: string[]
          missing_skills: string[]
          recommendations: Json
          created_at: string
        }
        Insert: {
          id?: string
          resume_id: string
          job_description: string
          match_score: number
          matching_skills: string[]
          missing_skills: string[]
          recommendations: Json
          created_at?: string
        }
        Update: {
          id?: string
          resume_id?: string
          job_description?: string
          match_score?: number
          matching_skills?: string[]
          missing_skills?: string[]
          recommendations?: Json
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}