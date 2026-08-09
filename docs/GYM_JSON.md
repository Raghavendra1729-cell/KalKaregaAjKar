# Gym plan JSON contract

Gym plans use strict, versioned JSON. Open **Gym → Plan**, choose the first date of the week, and copy the AI instructions. Give those instructions and your recent training package to an AI agent, then paste or upload the returned JSON.

The root object is:

```json
{
  "schema_version": 1,
  "plan_start": "2026-08-10",
  "days": []
}
```

`days` must contain exactly seven consecutive dates. A rest day has `day_type: "rest"` and no exercises. A workout day contains ordered exercises with this shape:

```json
{
  "name": "Bench press",
  "phase": "exercise",
  "order": 1,
  "sets": [
    { "reps": 10, "weight_kg": 30, "duration_seconds": null, "sides": 1 }
  ],
  "rest_between_sets_seconds": 90,
  "rest_after_exercise_seconds": 120,
  "equipment": ["Barbell", "Bench"],
  "instructions": ["Plant both feet.", "Lower with control and press."],
  "coaching_cue": "Keep wrists stacked over elbows.",
  "substitution": "Dumbbell bench press.",
  "safety_note": "Use a spotter for challenging sets."
}
```

Every set must have `reps` or `duration_seconds`. Use `sides: 2` for a timed left and right side. Use `null` for an unknown weight and optional text, and `0` when a rest timer is unnecessary. Do not use ranges in number fields.

The app validates the entire document before opening the editor. Importing does not lock anything: every day, exercise, set, timer, instruction, and suggestion remains editable before saving.

See [examples/gym-week.json](../examples/gym-week.json) for a complete importable week.
