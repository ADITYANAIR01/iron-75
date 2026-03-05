// ─── Iron75 Core Type Definitions ───────────────────────────────────────────

export interface DietSlots {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

export type MoodEmoji = 'great' | 'good' | 'meh' | 'bad' | 'terrible' | '';

export interface DailyLog {
  date: string; // YYYY-MM-DD
  gymWorkoutDone: boolean;
  outdoorWalkDone: boolean;
  waterLiters: number;
  waterGoalMet: boolean;
  readingDone: boolean;
  readingBook: string;
  dietSlots: DietSlots;
  moodEmoji: MoodEmoji;
  energyLevel: number; // 1–5
  motivationLevel: number; // 1–5
  sorenessLevel: number; // 1–5
  progressPhotoUrl: string; // base64 for now, Supabase Storage later
  allTasksComplete: boolean;
  celebrationShown: boolean;
  aiInsightShown: string;
  updatedAt?: string; // ISO timestamp for sync conflict resolution
}

export interface AppState {
  streak: number;
  currentDay: number;
  startDate: string; // YYYY-MM-DD ISO
  longestStreak: number;
  totalRestarts: number;
}

// ─── Workout set/exercise tracking ─────────────────────────────────────────
export interface SetState {
  done: boolean;
  reps: string;
}

export interface ExerciseState {
  sets: SetState[];
  notes: string;
  expanded: boolean;
}

export type TabId = 'today' | 'workout' | 'progress' | 'ai' | 'roadmap' | 'settings';
