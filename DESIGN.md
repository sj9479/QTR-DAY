# Design Brief

## Direction
Data Dashboard — clean, data-focused dashboard with date range filtering and week-over-week comparison controls.

## Tone
Dark editorial minimalism. Refined, professional, zero decoration. Every pixel serves clarity and information hierarchy.

## Differentiation
Cyan accent highlights interactive elements and active states against cool-grey card-based layout. Geometric typography creates contemporary data UI.

## Color Palette

| Token           | OKLCH              | Role                      |
| --------------- | ------------------ | ------------------------- |
| background      | 0.145 0.014 260    | primary surface           |
| foreground      | 0.95 0.01 260      | text on background        |
| card            | 0.18 0.014 260     | elevated content boxes    |
| card-foreground | 0.95 0.01 260      | text on cards             |
| primary         | 0.75 0.15 190      | interactive, highlights   |
| secondary       | 0.22 0.02 260      | muted interactive         |
| muted           | 0.22 0.02 260      | disabled, subtle text     |
| accent          | 0.75 0.15 190      | active states, borders    |
| destructive     | 0.55 0.2 25        | delete, remove actions    |
| border          | 0.28 0.02 260      | dividers, input borders   |
| chart-1         | 0.65 0.22 40       | data series 1 (orange)    |
| chart-2         | 0.6 0.12 185       | data series 2 (blue)      |
| chart-3         | 0.4 0.07 227       | data series 3 (purple)    |
| chart-4         | 0.83 0.19 84       | data series 4 (yellow)    |
| chart-5         | 0.77 0.19 70       | data series 5 (red)       |

## Typography
- Display: Space Grotesk — geometric, modern, tech-forward headings and titles
- Body: DM Sans — clean, highly readable at small sizes for labels and UI text
- Scale: hero `text-5xl font-bold tracking-tight`, h2 `text-3xl font-bold tracking-tight`, label `text-sm font-semibold uppercase`, body `text-base`

## Elevation & Depth
Card-based surfaces with subtle `shadow-xs`. Cards elevated one level from background via border and slight background shift. No drop shadows beyond minimal accent. Depth through layering and borders, not blur.

## Structural Zones

| Zone    | Background            | Border                | Notes                                    |
| ------- | --------------------- | --------------------- | ---------------------------------------- |
| Header  | card (0.18 0.014 260) | border (0.28 0.02)    | filter controls, date pickers, comparison toggle |
| Content | background (primary)  | —                     | alternating card sections, metric cards, chart, table |
| Sidebar | card                  | border                | navigation, active state in cyan primary |

## Spacing & Rhythm
Generous padding (1.5–2rem between sections). Cards grouped with 1rem gaps. Compact UI labels with 0.5rem micro-spacing. 16px base rhythm, scaled up for dashboard layouts.

## Component Patterns
- Buttons: rounded-md, primary (cyan bg), secondary (muted bg), hover via opacity shift
- Inputs: rounded-md, border, placeholder text in muted color
- Cards: rounded-lg with subtle border, `shadow-xs` for minimal lift
- Metric cards: numeric display, label below, accent underline on value
- Controls: date pickers and toggles use input styling, active state in primary cyan

## Motion
Smooth 0.3s transitions on all interactive elements. No bounce or ease-out spring. Transitions: all properties, restrained timing. State changes (hover, active, focus) via opacity and background shifts.

## Constraints
No gradients, no glow effects, no decorative animations. Maintain AA+ contrast in both light/dark. Sidebar only on desktop; mobile uses hamburger. Table remains scrollable for overflow.

## Signature Detail
Cyan primary accent creates visual continuity across interactive elements (buttons, active nav, date selection) against the cool grey palette. Geometric typography paired with minimal surfaces creates contemporary data UI identity.
