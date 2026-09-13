# EXPERIENCE_CONTEXT.md — GrantApp CGPA

Founder-confirmed visual/interaction doctrine, sitting alongside
INVARIANTS.md / DECISIONS.md. Any agent building a screen checks this
first. Status tags match the other doctrine files: `[CONFIRMED]`
founder-stated, `[OPEN]` flagged not guessed.

## 1. Two-mode architecture

1. `[CONFIRMED]` Onboarding (Faculty→Department→Year→Course) is a
   wizard: linear, one decision per screen, breadcrumb back-nav only,
   no persistent nav chrome. Runs once per student.
2. `[CONFIRMED]` Every other screen (submit material, take a test,
   analytics, research) is dashboard-mode: grid/list, ≤2 taps from
   anywhere, persistent nav always visible.
3. `[CONFIRMED]` Onboarding routes are not bookmarkable/re-enterable
   once a student has ≥1 enrollment — a returning student hitting
   `/onboarding/*` redirects to `/dashboard`. Adding a course after
   first use is a dashboard-native action, not a wizard re-entry.
4. `[OPEN]` Exact redirect-gate condition (≥1 enrollment vs. an
   explicit `onboarded_at` flag) — belongs in DATA_DICTIONARY.md.

## 2. Offline posture

5. `[CONFIRMED]` App is used heavily offline. This is a data/infra
   requirement, not yet built — no service worker, cache strategy, or
   local-first data layer exists in the repo as of this doctrine's
   writing. Flag to Data-infra layer, not a UI/x concern to solve with
   styling.
6. `[CONFIRMED]` No visual effect (glow, shimmer, animation) may be
   gated on network state or a fetch promise. All decoration is pure
   CSS/SVG, runs identically with no connection.
7. `[CONFIRMED]` Existing offline badge (`.nav-badge.offline`,
   `+layout.svelte`) is the base of the offline-status language —
   extend it, don't replace it.

## 3. Glow — liveness signal, not ambient wallpaper

8. `[CONFIRMED]` Glowing SVG watermarks in card/button backgrounds are
   a core brand device — including text/icon glyphs used this way, not
   just abstract shapes.
9. `[CONFIRMED]` Glow carries two distinct meanings, kept separate so
   the effect doesn't flatten through overuse:
   - **Idle/present** — very low opacity (0.06–0.10), static, no
     animation. Says "this exists here." Default state for dashboard
     cards.
   - **Active/live** — animated pulse, higher opacity, reserved for
     something genuinely in progress (an active streak, a
     mid-attempt test, an unread analytics update).
10. `[CONFIRMED]` Inspiration reference: amber/green phosphor
    status-glow language (Braun/Dieter Rams-era hi-fi displays) — glow
    as an honest "is this on/active" readout, not brand texture for
    its own sake.

## 4. Shimmer — imminent-change signal only

11. `[CONFIRMED]` Shimmer/skeleton sweeps are decorative flourish only
    — never gate real content, since content is local/cached, not
    fetched. This is explicit: don't build a shimmer that "loads" data,
    build one that plays for its own fixed duration regardless of data
    readiness.
12. `[CONFIRMED]` Reserve shimmer for content about to change (route
    transition into a course/test), never on already-settled content
    (a static dashboard grid, a rendered analytics chart).
13. `[CONFIRMED]` Inspiration reference: F1/racing telemetry HUD
    scan-line sweeps — used exclusively on live/changing data, never
    static readouts. Same restraint principle, borrowed from a domain
    that had to solve "liveliness without looking like a bug."

## 5. Animation budget — spare, not absent

14. `[CONFIRMED]` Animate sparingly. Per-screen budget:

| Screen/action | Animate? | What |
|---|---|---|
| Card hover | Yes | border → `--accent`, no shadow/scale |
| Card press | Yes | brief `--accent-dim` bg flash (~100ms) |
| Route transition into course/test | Yes | shimmer-sweep flourish, ≤300ms |
| Test answer submit | Yes (highest-value) | glow pulse, `--accent`→`--green`/`--red` |
| Dashboard grid on open | No | static, idle-glow watermark only |
| Analytics charts | No | static render |
| Nav rail icons | No | idle static; active tab may carry low-opacity glow |

15. `[CONFIRMED]` Inspiration reference: Playdate (Panic) — monochrome
    + one accent color, tactile press-depth over color variety, proof
    a single-accent system reads premium when state changes are felt
    rather than decorated.

## 6. Existing tokens/components to extend, not replace

16. `[CONFIRMED]` `app.css`'s `.notes-card:hover { box-shadow: 0 0 20px
    var(--accent-glow); }` is the seed of the glow system — already
    live in the codebase before this doctrine was written.
17. `[CONFIRMED]` `--accent` (#f59e0b, amber) stays the one glow color
    for now; no second glow hue introduced without a founder decision
    (mirrors the "one accent" restraint principle above).

## Still open (not yet interviewed)

- Whether "active/live" glow needs a distinct hue from idle glow, or
  stays amber at two opacity/animation states — not asked.
- Per-faculty watermark glyph set (which icon represents Medicine vs.
  Law, etc.) — not drafted.
- Offline-mode full visual treatment beyond the existing nav badge
  (e.g. does a queued-submission indicator get its own glow state) —
  not asked.
