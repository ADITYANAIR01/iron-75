// ─── Supabase Database Types ────────────────────────────────────────────────
// These match the tables created by the SQL migration in Docs/supabase-setup.md

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      app_state: {
        Row: {
          id: string;
          user_id: string;
          streak: number;
          current_day: number;
          start_date: string;
          longest_streak: number;
          total_restarts: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          streak?: number;
          current_day?: number;
          start_date?: string;
          longest_streak?: number;
          total_restarts?: number;
        };
        Update: {
          streak?: number;
          current_day?: number;
          start_date?: string;
          longest_streak?: number;
          total_restarts?: number;
          updated_at?: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          gym_workout_done: boolean;
          outdoor_walk_done: boolean;
          water_liters: number;
          water_goal_met: boolean;
          reading_done: boolean;
          reading_book: string;
          diet_slots: {
            breakfast: string;
            lunch: string;
            dinner: string;
            snacks: string;
          };
          mood_emoji: string;
          energy_level: number;
          motivation_level: number;
          soreness_level: number;
          progress_photo_url: string;
          all_tasks_complete: boolean;
          celebration_shown: boolean;
          ai_insight_shown: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          gym_workout_done?: boolean;
          outdoor_walk_done?: boolean;
          water_liters?: number;
          water_goal_met?: boolean;
          reading_done?: boolean;
          reading_book?: string;
          diet_slots?: {
            breakfast: string;
            lunch: string;
            dinner: string;
            snacks: string;
          };
          mood_emoji?: string;
          energy_level?: number;
          motivation_level?: number;
          soreness_level?: number;
          progress_photo_url?: string;
          all_tasks_complete?: boolean;
          celebration_shown?: boolean;
          ai_insight_shown?: string;
        };
        Update: {
          gym_workout_done?: boolean;
          outdoor_walk_done?: boolean;
          water_liters?: number;
          water_goal_met?: boolean;
          reading_done?: boolean;
          reading_book?: string;
          diet_slots?: {
            breakfast: string;
            lunch: string;
            dinner: string;
            snacks: string;
          };
          mood_emoji?: string;
          energy_level?: number;
          motivation_level?: number;
          soreness_level?: number;
          progress_photo_url?: string;
          all_tasks_complete?: boolean;
          celebration_shown?: boolean;
          ai_insight_shown?: string;
          updated_at?: string;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          session_type: string;
          day_of_week: string;
          exercises: Array<{
            name: string;
            sets: Array<{ reps: string; done: boolean }>;
            notes: string;
          }>;
          duration_minutes: number;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          session_type: string;
          day_of_week: string;
          exercises?: Array<{
            name: string;
            sets: Array<{ reps: string; done: boolean }>;
            notes: string;
          }>;
          duration_minutes?: number;
          completed?: boolean;
        };
        Update: {
          session_type?: string;
          exercises?: Array<{
            name: string;
            sets: Array<{ reps: string; done: boolean }>;
            notes: string;
          }>;
          duration_minutes?: number;
          completed?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}
