export type Phase = "warm_up" | "exercise" | "stretching";
export type DayType = "workout" | "rest";
export type ExerciseDifficulty = "easy" | "right" | "too_hard";

export type StudyTask = {
  id: string;
  title: string;
  group_name: string | null;
  sort_order: number;
  completed_at: string | null;
};

export type GymPlanSet = {
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  sides: number;
};

export type GymPlanExercise = {
  name: string;
  phase: Phase;
  order: number;
  sets: GymPlanSet[];
  rest_between_sets_seconds: number;
  rest_after_exercise_seconds: number;
  equipment: string[];
  instructions: string[];
  coaching_cue: string | null;
  substitution: string | null;
  safety_note: string | null;
};

export type GymPlanDay = {
  date: string;
  day_type: DayType;
  title: string;
  notes: string | null;
  exercises: GymPlanExercise[];
};

export type GymPlanDocument = {
  schema_version: 1;
  plan_start: string;
  days: GymPlanDay[];
};

export type WorkoutDay = {
  id: string;
  date: string;
  day_type: DayType;
  title: string | null;
  notes: string | null;
};

export type WorkoutPlannedSet = GymPlanSet & {
  id: string;
  set_number: number;
};

export type WorkoutSetLog = {
  set_number: number;
  planned_reps: number | null;
  planned_weight_kg: number | null;
  planned_duration_seconds: number | null;
  planned_sides: number;
  actual_reps: number | null;
  actual_weight_kg: number | null;
  actual_duration_seconds: number | null;
  completed_sides: number;
  completed_at: string | null;
};

export type WorkoutExerciseReview = {
  difficulty: ExerciseDifficulty | null;
  discomfort: boolean;
  notes: string | null;
  completed_at: string | null;
};

export type WorkoutItem = {
  id: string;
  phase: Phase;
  sort_order: number;
  exercise_name: string;
  rest_between_sets_seconds: number;
  rest_after_exercise_seconds: number;
  equipment: string[];
  instructions: string[];
  coaching_cue: string | null;
  substitution: string | null;
  safety_note: string | null;
  planned_sets: WorkoutPlannedSet[];
  set_logs: WorkoutSetLog[];
  review: WorkoutExerciseReview | null;
};

export type WorkoutDayData = {
  day: WorkoutDay | null;
  items: WorkoutItem[];
  session: { completed_at: string | null } | null;
};

export type WorkoutHistoryDay = {
  date: string;
  day_type: DayType;
  title: string | null;
  completed_at: string | null;
};
