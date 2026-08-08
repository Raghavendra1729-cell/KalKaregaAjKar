# Kal Karega, Aaj Kar — Design System

## Product context

Kal Karega, Aaj Kar is a private, single-user web app that turns two recurring routines into calm, executable plans:

1. Gym: upload one weekly CSV, edit the imported week, run today's warm-up / exercise / stretching session step by step, and save one small weekly progress photo.
2. Study: write tomorrow's tasks the night before, group them by subject or project, focus with an optional timer, and mark them complete.

The product deliberately avoids social features, calorie tracking, complex exercise analytics, projects shared with others, and generic team-productivity features. It should feel like opening a well-kept personal notebook that already knows what matters today.

## Information architecture

- Login: a single password from the server environment. No signup, reset-password, or account-management UI.
- Today: one compact command board. Shows today's gym status, today's study tasks, the next action, current streak, and shortcuts to continue. It is a view, not a third data model.
- Study: Today and Tomorrow tabs. Add/edit/reorder tasks, choose a small group label, optional duration, optional focus timer, and completion checkbox. Gym never appears as a study group.
- Gym: Today, Week plan, History, and Progress tabs.
  - Today runs the session in three ordered phases: Warm up, Exercises, Stretching. A rest day has its own quiet completion state.
  - Week plan imports CSV, validates rows, previews errors, allows inline editing after import, and can export a corrected CSV.
  - History is a calendar heat map. A flame appears only after the full planned session or rest-day check-in is completed.
  - Progress stores one compressed small photo and optional note per week directly in Postgres/Supabase storage data, not Cloudinary.
- Settings: sound or vibration cue, notification preferences, and logout. Keep it a small sheet/page.

## Core workout interaction

- Always show phase, step number, exercise name, and only non-null values.
- Examples: `12 reps × 3 sets · 20 kg`, `Hold 30 sec`, or `Walk · 5 min`. Never render empty chips, `null`, zero placeholders, or meaningless labels.
- Timed steps use one large Start/Pause control and a circular countdown. Untimed weight/repetition steps use `Complete set`; completing a set advances `1 of 3`, then the exercise advances.
- A timed set finishing fires the user's selected short sound or vibration cue, then waits for explicit confirmation before advancing. Do not auto-start the next exercise.
- Stretching supports duration-per-side and sides; warm-up supports duration or reps; exercises support sets, reps, weight, and optional rest timer.
- Back and Skip remain available but secondary. Exiting preserves progress.

## Visual direction

Inspired by calm digital-wellness products, adapted into a practical authenticated application rather than a marketing page.

### Color

- Canvas: `#F7F4EE` warm cream
- Surface: `#FFFDF9`
- Ink: `#25231F`
- Muted ink: `#69655D`
- Coral action: `#F47D65`
- Coral soft: `#FBE2DB`
- Sage success/gym: `#BDD2C2`
- Sage soft: `#E7EFE8`
- Butter/study: `#F3D98B`
- Lavender rest/recovery: `#DDD8E9`
- Border: `#E4DED3`
- Destructive: `#B94A48`

Use coral for the single primary action on a screen, sage for completed/gym state, butter for study cues, and lavender for rest days. Never introduce neon, gradient-heavy, blue SaaS, or dark glass aesthetics.

### Typography

- Primary: `Manrope`, fallback `ui-sans-serif, system-ui, sans-serif`.
- Numerals/timer: `DM Mono`, fallback `ui-monospace, SFMono-Regular, monospace`.
- Sentence case only. Headlines are 30–44px desktop and 26–34px mobile, weight 650–750, tight but not cramped. Body is 14–16px.
- Do not use decorative or cursive fonts; workout values must scan instantly.

### Shape and depth

- App shell maximum width 1240px with 24–32px page padding; mobile uses 16px.
- Cards use 20–28px radius, 1px warm border, and almost-flat shadow `0 8px 28px rgba(66, 52, 35, 0.06)`.
- Buttons are 12–16px radius, minimum 44px height. Primary workout button can be circular/rounded and oversized.
- Use thin-line Lucide-style icons. Never use emoji as functional icons. A flame may be a filled icon for completed calendar days.

### App shell

- Desktop: slim left rail (logo, Today, Study, Gym; Settings/Logout at bottom) and a generous main canvas.
- Mobile: compact top brand row plus fixed bottom navigation for Today, Study, and Gym. Respect safe-area insets.
- The active section uses a tinted rounded rectangle and strong ink, not a full-color sidebar.

## Component patterns

- Day header: date, short human greeting, and one clear next action.
- Plan card: phase-colored index, title, compact values, completion control, drag handle only in edit mode.
- Progress ring: simple SVG ring with high-contrast center value; no chart library look.
- Heat map: month grid with accessible labels; empty, planned, partially complete, and complete states. Only complete uses the flame.
- Task row: checkbox, title, optional group pill and duration. Focus button appears on hover/focus or as a compact secondary action.
- Upload zone: clear CSV or image affordance, constraints, and one sample/download action. Always show preview before committing an import.
- Dialogs/sheets: use for focused add/edit actions; never create multi-step wizards unless CSV validation requires preview then confirm.

## Motion and feedback

- 140–220ms ease-out for taps, drawers, and row completion.
- Timer ring progresses continuously without distracting glow.
- On completion: brief 1.02 scale, sage fill, checkmark draw, optional device vibration or chosen sound.
- Respect `prefers-reduced-motion`; cues still work without visual animation.

## Accessibility and responsive requirements

- WCAG AA text contrast, visible focus rings, semantic buttons and labels.
- All timer controls keyboard accessible; do not rely on color alone for workout state.
- Mobile is a first-class workout surface. Main controls must be reachable one-handed and usable at 360px width.
- Desktop prioritizes week editing and calendar review without making the workout player feel stretched.

## Product copy

- Direct and reassuring: “Ready when you are”, “Next up”, “Week saved”, “Rest is part of the plan”.
- Avoid guilt, shame, competitive rankings, and exaggerated motivational language.
- App name may be shortened visually to “Kal Karega” with the line “Aaj kar.” as the quiet brand payoff.

## Design constraints

- Use only the fonts, colors, spacing, and component styles defined here.
- Do not introduce new fonts, colors, gradients, glassmorphism, or visual styles.
- Keep screens sparse: one primary action, progressive disclosure for editing, and no feature wall.
