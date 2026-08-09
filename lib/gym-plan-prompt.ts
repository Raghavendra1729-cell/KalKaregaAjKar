import { gymPlanExample } from "@/lib/gym-plan-model";

export function gymAiPrompt(planStart: string) {
  const example = JSON.stringify(gymPlanExample(planStart), null, 2);
  return `You are creating a personalized seven-day gym plan for import into my private workout app.

Conversation first:
- Use the training history and preferences I provide.
- If essential information is missing, ask only about my goal, experience, injuries or movement constraints, available equipment, preferred session length, and days I cannot train.
- Do not guess working weights when history is insufficient. Use null and let me edit it.
- Once you have enough information, return valid JSON only. Do not use a Markdown fence or add an explanation.

Output contract:
- schema_version must be 1.
- plan_start must be ${planStart}.
- days must contain exactly the 7 consecutive dates beginning on plan_start, once each.
- day_type must be workout or rest.
- Rest days must have an empty exercises array and useful recovery notes.
- Workout days must contain ordered warm_up, exercise, and stretching movements appropriate to that session.
- Every exercise has one or more explicit set objects. Never write a range such as "8-12" in a number field.
- Every set needs reps or duration_seconds. Use sides=2 when duration applies separately to left and right.
- weight_kg is a number or null. All other optional text fields are strings or null.
- rest_between_sets_seconds is the timer after a completed set when another set remains.
- rest_after_exercise_seconds is the timer after the final set, while I review the exercise before continuing.
- Use 0 when no rest timer is useful. Do not add meaningless timers.
- equipment is a JSON string array.
- instructions is a short ordered JSON string array covering setup, movement, breathing, and safe finish.
- coaching_cue is one useful cue, not generic motivation.
- substitution is a practical alternative or null.
- safety_note is a concise warning or null.
- Include sensible recovery days. Do not make all seven days hard workouts.
- Previous actual performance is evidence, not permission to increase weight automatically. Progress only when the data supports it.
- Return only the plan object, never training history or analysis.

This is a complete valid example of the exact structure. Replace its training content while preserving the structure:
${example}`;
}

export function gymJsonExample(planStart: string) {
  return JSON.stringify(gymPlanExample(planStart), null, 2);
}
