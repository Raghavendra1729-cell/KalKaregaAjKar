export type Phase = "warm_up" | "exercise" | "stretching";
export type DayType = "workout" | "rest";

export type GymCsvRow = {
  plan_start: string;
  date: string;
  day_type: DayType;
  title: string | null;
  phase: Phase | null;
  order: number | null;
  exercise_name: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  duration_seconds: number | null;
  rest_seconds: number | null;
  sides: number | null;
  notes: string | null;
};

export type StudyCsvRow = {
  date: string;
  order: number;
  task: string;
  group: string | null;
  duration_minutes: number | null;
  notes: string | null;
};
