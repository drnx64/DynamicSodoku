# Dynamic Sudoku

A fully dynamic Sudoku web app with multi-page menu flow, difficulty selection, level/rank progression, daily challenges, and streak system.

## Features

### Gameplay
- **4 Difficulty Levels** — Easy, Medium, Hard, Impossible (21–46 clue ranges)
- **Pencil Marks** — Toggle notes mode to annotate candidates per cell
- **Undo / Redo** — Full move history with keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z)
- **Auto-Clear Notes** — Automatically remove pencil marks for a placed number across row, column, and box
- **Auto-Candidates** — One-tap toggle to show all possible candidates for empty cells
- **Teaching Hints** — Shows the solving technique (Naked Single, Hidden Single) on first tap; reveals the answer on second tap
- **Mistake Limit** — 3 strikes and the game ends (toggleable in settings)

### Puzzle Generation
- Technique-based difficulty grader using human solving strategies:
  - Naked / Hidden Singles, Pairs, Triples
  - Pointing Pairs, Box-Line Reduction
  - X-Wing, Bifurcation
- Unique-solution guarantee via backtracking solver
- Seeded RNG for daily puzzles (same puzzle worldwide per date)

### Progression System
- **32 Ranks** — Wood I → Elite Grandmaster with XP-based progression
- **XP Scoring** — Weighted distribution (80% 10–15 XP, 12% 45–55 XP, ~8% 60–85 XP, 0.01% 100 XP); performance modifier ±15 XP
- **Daily Challenge** — One puzzle per day with bonus XP
- **Streak Tracking** — Consecutive daily completions with fire badge; streak-lost modal on >24h gap

### UI & Experience
- **Dark / Light Themes** — Toggle in settings, persisted to localStorage
- **Customizable Settings** — 10 toggles: highlights, auto-candidates, remaining counts, mistake limit, timer, theme, sounds, auto-clear notes
- **SVG Icons** — All icons rendered as inline SVGs (no emoji)
- **Animations** — Cell pop/shake on placement/mistake, slide transitions, toast notifications
- **Sound Effects** — Web Audio API tones for place, error, and win events
- **Timer** — Start on first move, pause/resume on click, displays H:MM:SS
- **Responsive Layout** — Adapts to mobile and desktop viewports
- **Autosave** — Game state saved to localStorage on every action; resumes on reload

## Project Structure

```
├── index.html          # Main HTML with SVG sprite, pages, and modals
├── css/
│   └── style.css       # All styles: themes, layout, animations, responsive
├── js/
│   ├── engine.js       # Board validation, solver, conflict detection
│   ├── rng.js          # Seeded pseudo-random number generator
│   ├── generator.js    # Puzzle generation with carving and unique-solution guarantee
│   ├── grader.js       # Human-technique difficulty grader
│   ├── xp.js           # 32-rank definitions and XP calculations
│   ├── sound.js        # Web Audio API tone effects
│   ├── storage.js      # localStorage persistence layer
│   ├── settings.js     # Settings UI and defaults
│   ├── game.js         # Core game state, moves, undo/redo, timer, hints, win/over
│   ├── ui.js           # Board rendering, cell updates, numpad, input handling
│   ├── nav.js          # Page transitions and navigation
│   ├── win.js          # Win dialog, XP award, streak update
│   ├── menu.js         # Main menu UI, XP bar, daily status
│   └── init.js         # Bootstrap and initialization
├── assets/             # Static assets (favicon, etc.)
└── README.md
```

## Getting Started

1. Open `index.html` in any modern browser.
2. Click **Play Game** to choose a difficulty, or **Daily Challenge** for today's puzzle.
3. Select a cell and use the numpad or keyboard (1–9) to place numbers.
4. Toggle **Notes** (or press `N`) to annotate candidates before committing.

No build tools or server required — just open and play.

## License

MIT
