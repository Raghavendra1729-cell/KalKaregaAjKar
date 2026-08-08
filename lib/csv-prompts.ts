export const gymAiPrompt = `Create my next seven-day gym plan as CSV only.

Rules:
- The plan may begin on ANY date; it does not need to be Monday.
- Use exactly these columns in this order:
plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
- plan_start is the first day of the plan in YYYY-MM-DD and is identical on every row.
- Include all 7 consecutive dates from plan_start through plan_start + 6 days.
- day_type is workout or rest.
- A rest day has one row. Leave phase, order, exercise_name, sets, reps, weight_kg, duration_seconds, rest_seconds, and sides empty.
- A workout has one row per movement.
- phase is warm_up, exercise, or stretching.
- order starts at 1 inside each phase for each date.
- Every workout movement needs exercise_name and at least reps or duration_seconds.
- sets, reps, weight_kg, duration_seconds, rest_seconds, and sides are numbers only. Leave an optional value empty; never write null, N/A, or '-'.
- Use sides=2 for left/right movements when the duration applies per side.
- Quote a field only when it contains a comma.
- Return raw CSV only, with no Markdown fence and no explanation.

My plan should start on: [YYYY-MM-DD]
My goal/constraints/equipment: [WRITE HERE]`;

export const studyAiPrompt = `Create my Study plan as CSV only.

Rules:
- Use exactly these columns in this order:
date,order,task,group,duration_minutes,notes
- Use one date only in YYYY-MM-DD. This can be today's plan written in the morning or tomorrow's plan written the night before.
- order starts at 1.
- task is required and should describe a clear finishable result.
- group is optional, but never use Gym because Gym has its own section.
- duration_minutes is optional and numeric. Leave it empty when no focus timer is needed.
- notes is optional and should be a short success condition.
- Leave optional values empty; never write null, N/A, or '-'.
- Quote a field only when it contains a comma.
- Return raw CSV only, with no Markdown fence and no explanation.

Plan date: [YYYY-MM-DD]
What I need to study: [WRITE HERE]`;
