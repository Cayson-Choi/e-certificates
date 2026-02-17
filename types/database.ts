// Supabase Database 타입 정의
// 생성일: 2026-02-16

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'

export type Affiliation = '교수' | '전기반' | '소방반' | '신중년'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          affiliation: Affiliation | null
          phone: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          affiliation?: Affiliation | null
          phone?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          affiliation?: Affiliation | null
          phone?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      exams: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
        }
      }
      subjects: {
        Row: {
          id: number
          exam_id: number
          name: string
          questions_per_attempt: number
          order_no: number
          created_at: string
        }
        Insert: {
          id?: number
          exam_id: number
          name: string
          questions_per_attempt: number
          order_no: number
          created_at?: string
        }
        Update: {
          id?: number
          exam_id?: number
          name?: string
          questions_per_attempt?: number
          order_no?: number
          created_at?: string
        }
      }
      questions: {
        Row: {
          id: number
          question_code: string
          exam_id: number
          subject_id: number
          question_text: string
          choice_1: string
          choice_2: string
          choice_3: string
          choice_4: string
          answer: number
          explanation: string | null
          image_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          question_code: string
          exam_id: number
          subject_id: number
          question_text: string
          choice_1: string
          choice_2: string
          choice_3: string
          choice_4: string
          answer: number
          explanation?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          question_code?: string
          exam_id?: number
          subject_id?: number
          question_text?: string
          choice_1?: string
          choice_2?: string
          choice_3?: string
          choice_4?: string
          answer?: number
          explanation?: string | null
          image_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      attempts: {
        Row: {
          id: number
          user_id: string
          exam_id: number
          status: AttemptStatus
          started_at: string
          expires_at: string
          submitted_at: string | null
          total_questions: number
          total_correct: number | null
          total_score: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          exam_id: number
          status?: AttemptStatus
          started_at?: string
          expires_at: string
          submitted_at?: string | null
          total_questions: number
          total_correct?: number | null
          total_score?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          exam_id?: number
          status?: AttemptStatus
          started_at?: string
          expires_at?: string
          submitted_at?: string | null
          total_questions?: number
          total_correct?: number | null
          total_score?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      attempt_questions: {
        Row: {
          attempt_id: number
          seq: number
          question_id: number
        }
        Insert: {
          attempt_id: number
          seq: number
          question_id: number
        }
        Update: {
          attempt_id?: number
          seq?: number
          question_id?: number
        }
      }
      attempt_items: {
        Row: {
          attempt_id: number
          question_id: number
          selected: number | null
          is_correct: boolean | null
        }
        Insert: {
          attempt_id: number
          question_id: number
          selected?: number | null
          is_correct?: boolean | null
        }
        Update: {
          attempt_id?: number
          question_id?: number
          selected?: number | null
          is_correct?: boolean | null
        }
      }
      subject_scores: {
        Row: {
          attempt_id: number
          subject_id: number
          subject_questions: number
          subject_correct: number
          subject_score: number
        }
        Insert: {
          attempt_id: number
          subject_id: number
          subject_questions: number
          subject_correct: number
          subject_score: number
        }
        Update: {
          attempt_id?: number
          subject_id?: number
          subject_questions?: number
          subject_correct?: number
          subject_score?: number
        }
      }
      daily_best_scores: {
        Row: {
          kst_date: string
          exam_id: number
          user_id: string
          best_score: number
          best_submitted_at: string
          attempt_id: number
        }
        Insert: {
          kst_date: string
          exam_id: number
          user_id: string
          best_score: number
          best_submitted_at: string
          attempt_id: number
        }
        Update: {
          kst_date?: string
          exam_id?: number
          user_id?: string
          best_score?: number
          best_submitted_at?: string
          attempt_id?: number
        }
      }
      daily_leaderboard_snapshots: {
        Row: {
          kst_date: string
          exam_id: number
          rank: number
          user_id: string | null
          user_name_display: string
          score: number
          submitted_at: string
        }
        Insert: {
          kst_date: string
          exam_id: number
          rank: number
          user_id?: string | null
          user_name_display: string
          score: number
          submitted_at: string
        }
        Update: {
          kst_date?: string
          exam_id?: number
          rank?: number
          user_id?: string | null
          user_name_display?: string
          score?: number
          submitted_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: number
          admin_user_id: string
          action_type: string
          target_table: string
          target_id: string | null
          reason: string | null
          changed_fields: Json | null
          old_data: Json | null
          new_data: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          admin_user_id: string
          action_type: string
          target_table: string
          target_id?: string | null
          reason?: string | null
          changed_fields?: Json | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          admin_user_id?: string
          action_type?: string
          target_table?: string
          target_id?: string | null
          reason?: string | null
          changed_fields?: Json | null
          old_data?: Json | null
          new_data?: Json | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      to_kst_date: {
        Args: { ts: string }
        Returns: string
      }
      now_kst: {
        Args: Record<string, never>
        Returns: string
      }
      is_prohibited_hour_kst: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: {
      attempt_status: AttemptStatus
    }
  }
}
