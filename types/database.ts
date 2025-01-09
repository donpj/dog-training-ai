export type DifficultyLevel = "beginner" | "intermediate" | "advanced";
export type TrainingStatus = "not_started" | "in_progress" | "completed";

export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: number;
  created_at: string;
  updated_at: string;
  owner_id: string;
  name: string;
  breed?: string | null;
  date_of_birth?: string | null;
  weight_lbs?: number | null;
}

export interface TrainingPlan {
  id: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  dog_id: number;
  title: string;
  description: string;
  behavior_to_correct?: string;
  difficulty: DifficultyLevel;
  duration_weeks: number;
  sessions_per_week: number;
  training_days: string[];
  status: TrainingStatus;
  progress_percentage?: number;
  average_rating?: number;
  total_sessions?: number;
}

export interface TrainingStep {
  id: number;
  plan_id: number;
  title: string;
  description?: string;
  day_number: number;
  duration_minutes?: number;
  video_url?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: number;
  step_id: number;
  dog_id: number;
  completed_at: string;
  achievements: string;
  challenges: string;
  duration_minutes: number;
  repetitions: number;
  environment_notes: string;
  environments: string[];
  dog_mood: string;
  rating: number;
  treats_used: string;
  trainer_mood: string;
  next_steps: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  message: string;
  ai_response: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
      };
      dogs: {
        Row: Dog;
        Insert: Omit<Dog, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<Dog, "id" | "owner_id" | "created_at" | "updated_at">
        >;
      };
      training_plans: {
        Row: TrainingPlan;
        Insert: Omit<TrainingPlan, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<TrainingPlan, "id" | "dog_id" | "created_at" | "updated_at">
        >;
      };
      training_steps: {
        Row: TrainingStep;
        Insert: Omit<TrainingStep, "id" | "created_at" | "updated_at">;
        Update: Partial<
          Omit<TrainingStep, "id" | "plan_id" | "created_at" | "updated_at">
        >;
      };
      training_sessions: {
        Row: TrainingSession;
        Insert: Omit<TrainingSession, "id" | "completed_at">;
        Update: Partial<
          Omit<TrainingSession, "id" | "step_id" | "dog_id" | "completed_at">
        >;
      };
      chat_history: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at">;
        Update: Partial<Omit<ChatMessage, "id" | "user_id" | "created_at">>;
      };
    };
    Enums: {
      difficulty_level: DifficultyLevel;
      training_status: TrainingStatus;
    };
  };
};
