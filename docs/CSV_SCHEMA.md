# CSV schemas

Both import screens always show a preview. Fix cells in the preview before saving, or save and edit the plan later. Empty optional cells remain `null` and are never shown in the workout/task UI.

## Gym weekly CSV

Upload one Monday-to-Sunday week at a time. Download/copy [the complete example](../examples/gym-week.csv).

```csv
week_start,date,day_type,title,phase,order,exercise_name,sets,reps,weight_kg,duration_seconds,rest_seconds,sides,notes
2026-08-10,2026-08-10,workout,Push day,warm_up,1,Treadmill,,,,300,,,Easy pace
2026-08-10,2026-08-10,workout,Push day,exercise,1,Bench press,3,10,30,,90,,
2026-08-10,2026-08-10,workout,Push day,stretching,1,Doorway chest stretch,,,,30,,2,30 seconds per side
2026-08-10,2026-08-11,rest,Recovery,,,,,,,,,,Sleep well
```

| Column | Required | Meaning |
| --- | --- | --- |
| `week_start` | Yes | Monday of the uploaded week, `YYYY-MM-DD`. Every row must match. |
| `date` | Yes | Planned calendar day, `YYYY-MM-DD`, inside that week. |
| `day_type` | Yes | `workout` or `rest`. A rest day needs only the date, type, and optional title/notes. |
| `title` | No | Day label such as `Push day` or `Recovery`. |
| `phase` | Workout rows | `warm_up`, `exercise`, or `stretching`. |
| `order` | Workout rows | Position within its phase, starting at `1`. |
| `exercise_name` | Workout rows | What to do. |
| `sets` | No | Number of sets. Blank means one pass and the UI hides the sets label. |
| `reps` | Conditional | Repetitions per set. Supply `reps`, `duration_seconds`, or both. |
| `weight_kg` | No | Weight in kilograms. `0` is allowed for bodyweight; blank hides weight entirely. |
| `duration_seconds` | Conditional | Countdown for a timed movement or hold. With `sides=2`, it applies per side. |
| `rest_seconds` | No | Countdown after a completed set. Blank means no rest timer. |
| `sides` | No | Usually `2` for left/right stretching. Blank means not side-specific. |
| `notes` | No | Short technique or pace cue. |

Rules:

- Use one row per exercise/movement and one row for each rest day.
- An exercise may be manual (`sets + reps + weight`), timed (`duration_seconds`), or mixed.
- Warm-up and stretching use the same columns, so the schema does not break when one uses reps and another uses a hold timer.
- Do not write the word `null`; leave the cell empty.
- Re-uploading the same `week_start` replaces that week only after the preview is confirmed.

## Study nightly CSV

Upload only one date at a time—the plan you prepare the previous night. Download/copy [the complete example](../examples/study-day.csv).

```csv
date,order,task,group,duration_minutes,notes
2026-08-09,1,Solve two DP problems,CSES,60,Start with one-dimensional DP
2026-08-09,2,Review database indexes,Khaao,35,
2026-08-09,3,Read operating systems notes,College,,Chapter 4
```

| Column | Required | Meaning |
| --- | --- | --- |
| `date` | Yes | Day you will do the task, `YYYY-MM-DD`. All rows must use the same date. |
| `order` | Yes | Task order, starting at `1`. |
| `task` | Yes | Clear task name. |
| `group` | No | Subject/project such as `CSES`, `College`, or `Khaao`. `Gym` is reserved and rejected in the UI. |
| `duration_minutes` | No | Optional focus-timer length. Blank hides the timer. |
| `notes` | No | Small success criterion or reminder. |

Study history is stored per date, including task completion. Uploading a date again previews a replacement; nothing from another date is changed.
