
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
  readingDone: boolean;
  readingBook: string;
  dietSlots: DietSlots;
  moodEmoji: MoodEmoji;
  energyLevel: number; // 1–5
  motivationLevel: number; // 1–5
  sorenessLevel: number; // 1–5
  progressPhotoUrl: string; // legacy single-photo field (kept for backward compat)
  progressPhotos: string[]; // up to 4 cloud URLs
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

export type UserFocus = 'habit_first' | 'gym_first' | 'balanced';

export type ProgressionSource = 'workout' | 'walk' | 'diet' | 'mood' | 'reading' | 'mission_path';

export interface ProgressionDailyState {
  date: string; // YYYY-MM-DD
  xpGained: number;
  claimedSources: ProgressionSource[];
}

export interface ProgressionState {
  totalXp: number;
  level: number;
  daily: ProgressionDailyState;
}

export interface SetState {
  done: boolean;
  reps: string;
}

export interface ExerciseState {
  sets: SetState[];
  notes: string;
  expanded: boolean;
}

export type TabId = 'today' | 'workout' | 'progress' | 'ai' | 'settings';

export type ChallengeId = 'tip' | 'pattern' | 'motivation' | 'recovery' | 'nutrition';
