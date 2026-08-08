# Copy-ready CSV schemas

The Study and Gym importers accept either a `.csv` file or CSV text pasted directly into the app. Both show an editable preview before saving. Leave optional cells empty—do not write `null`, `N/A`, or `-`. Empty values are stored as `null` and hidden in the daily user interface.

## Gym: one seven-day weekly plan

A Gym plan always covers exactly seven consecutive calendar dates, but it may start on any day. For example, a plan can start on Wednesday and finish on Tuesday. Every date must be represented by at least one workout row or exactly one rest row.

Exact header:

```csv
plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
```

Use [the complete midweek example](../examples/gym-week.csv), or copy the AI prompt from the Gym page.

| Column             | Required     | Meaning                                                                                                 |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| `plan_start`       | Yes          | First date of this seven-day plan, `YYYY-MM-DD`; identical on every row. It does not need to be Monday. |
| `date`             | Yes          | One of the seven dates from `plan_start` through `plan_start + 6 days`.                                 |
| `day_type`         | Yes          | `workout` or `rest`. Never mix both types on one date.                                                  |
| `title`            | No           | Day label such as `Push day` or `Recovery`.                                                             |
| `phase`            | Workout rows | `warm_up`, `exercise`, or `stretching`. Blank on rest rows.                                             |
| `order`            | Workout rows | Position within the phase, starting at `1`; each phase/order pair must be unique for that date.         |
| `exercise_name`    | Workout rows | Movement name.                                                                                          |
| `sets`             | No           | Planned sets. Blank means one pass.                                                                     |
| `reps`             | Conditional  | Repetitions per set. Supply `reps`, `duration_seconds`, or both.                                        |
| `weight_kg`        | No           | Weight in kilograms. `0` is valid; blank hides weight.                                                  |
| `duration_seconds` | Conditional  | Movement or hold countdown.                                                                             |
| `rest_seconds`     | No           | Rest countdown after a set.                                                                             |
| `sides`            | No           | Usually `2` for left/right movements.                                                                   |
| `notes`            | No           | Short pace, technique, or recovery cue.                                                                 |

Workout rows can be rep-based, timer-based, or both. A rest day has one row and leaves movement fields empty. Re-uploading the same `plan_start` updates that plan after preview; saved plans can also be loaded and edited later.

### Prompt for an AI agent

The app has a **Copy AI prompt** button. You can also copy this directly:

```text
Create my next seven-day gym plan as CSV only.

The plan may begin on ANY date; it does not need to be Monday. Use exactly these columns in this order:
plan_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes

Use the same plan_start on every row. Include all 7 consecutive dates. day_type is workout or rest. A rest day has exactly one row with movement fields empty. A workout has one row per movement. phase is warm_up, exercise, or stretching. order starts at 1 within each phase and date. Every workout movement needs exercise_name and at least reps or duration_seconds. Numeric fields contain numbers only. Leave optional values empty; never write null, N/A, or '-'. Quote fields only when they contain a comma. Return raw CSV only with no Markdown fence or explanation.

My plan should start on: [YYYY-MM-DD]
My goal, constraints, and equipment: [WRITE HERE]
```

## Study: one independent day

Study is not weekly. Create or upload one chosen date at a time: today in the morning, tomorrow the night before, or any other day selected from the calendar.

Exact header:

```csv
date,order,task,group,duration_minutes,notes
```

Use [the complete daily example](../examples/study-day.csv), or copy the AI prompt from the Study page.

| Column             | Required | Meaning                                                                                                  |
| ------------------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `date`             | Yes      | The single day the tasks belong to, `YYYY-MM-DD`; every row must match.                                  |
| `order`            | Yes      | Unique task order starting at `1`.                                                                       |
| `task`             | Yes      | A clear, finishable task.                                                                                |
| `group`            | No       | Subject/project such as `CSES`, `College`, or `Khaao`. `Gym` is rejected because it has its own section. |
| `duration_minutes` | No       | Focus timer length; blank hides the timer.                                                               |
| `notes`            | No       | Short success condition or reminder.                                                                     |

Saving a date replaces only that date's Study plan. Completion and history remain organized by calendar date.

### Prompt for an AI agent

```text
Create my Study plan as CSV only.

Use exactly these columns in this order:
date,order,task,group,duration_minutes,notes

Use one date only in YYYY-MM-DD. This can be today's plan written in the morning, tomorrow's plan written the night before, or another chosen date. order starts at 1 and is unique. task is required and finishable. group is optional, but never use Gym because Gym has its own section. duration_minutes and notes are optional. Leave optional values empty; never write null, N/A, or '-'. Quote fields only when they contain a comma. Return raw CSV only with no Markdown fence or explanation.

Plan date: [YYYY-MM-DD]
What I need to study: [WRITE HERE]
```
