# Leopardy!

A game-master-controlled trivia game built to be mirrored onto a smart TV. One
person runs the whole game from a single screen — there are no buzzers and no
per-player devices. After each clue you simply tap which players got it right
(+value) or wrong (−value).

> **Unofficial fan project.** Leopardy! is not affiliated with, endorsed by, or
> sponsored by Jeopardy Productions, Inc., which owns the *Jeopardy!* name and
> show. This repository contains no clues from the show: it ships one original
> sample game, and you supply any others.

## How it's meant to be used

1. Open the app on a laptop/computer.
2. **AirPlay / screen-mirror** that screen to your smart TV (or open the app
   directly in the TV's browser).
3. The game master runs everything from the same screen — they can play too.

Tap **⛶** in the top bar to go fullscreen on the TV.

## Rounds

Games with more than one round show **round tabs** above the board. Scores carry
across rounds. Tap **Final** any time for the final clue.

## Playing

- **Tap a clue** on the board → it fills the screen.
- **Reveal Answer** when you're ready (control lives in the bottom bar, always
  visible).
- **Award points:** tap ✓ (correct, +value) or ✕ (wrong, −value) for each
  player. Live previews show the resulting scores. Tap again to clear.
- **Score & Close** applies the points and marks the clue used. **Cancel** backs
  out without changing anything.
- **Final Leopardy!** is a single clue worth **2500**, scored the same way.

### Players
- Add with **+ Add player**, click a name to rename, hover to remove or nudge a
  score by ±100 (for manual corrections). The leader is highlighted.

## Adding your own games

### Edit or import a board
Start a game and tap **Edit**:
- **Board** — edit categories, clues, answers, and point values; add/remove
  categories.
- **Final Leopardy!** — edit the final clue (value defaults to 2500).
- **Import / Export**:
  - Import a board from a **CSV** or **JSON** file (or paste text).
  - Export the current game as CSV or JSON.
  - Reset board progress, reset scores, or reload the sample game.

Everything is saved automatically in your browser (localStorage).

#### CSV format
Columns (header required, case-insensitive): `round, category, value, clue, answer`

```csv
round,category,value,clue,answer
leopardy,Science,200,"This gas has the symbol O",What is oxygen?
leopardy,Science,400,The powerhouse of the cell,What is the mitochondrion?
final,Authors,2500,"Wrote 'Hamlet' and 'Romeo and Juliet'",Who is Shakespeare?
```

- Rows are grouped into categories by the order categories first appear.
- A row with `final` in the `round` column populates Final Leopardy!.
- Quoted fields (with commas) are supported.

### Add games to the library
**Browse games** and **Random** read from `public/games/`. Only add games you
have the right to use.

- `index.json` — lightweight metadata (date, episode number, categories) for
  browsing.
- `y<YEAR>.json` — full boards for that year, keyed by game id and fetched on
  demand.

The included sample game shows the format.

## Development

```bash
npm install
npm run dev          # start the dev server at http://localhost:3000
npm test             # run the unit tests
npm run lint         # lint
npm run build        # production build
npm start            # serve the production build
```

### Suggestion box (optional)
The 💡 Suggest button posts to `/api/feedback`, the app's only server code, which
files each submission as a GitHub issue. To turn it on, copy `.env.example` to
`.env.local` and fill it in.

Point `FEEDBACK_REPO` at a **private** repo. Issues are created with your token,
so they appear under your GitHub account, and the endpoint has no login or rate
limit.

Built with Next.js (App Router), React, and Tailwind CSS v4. There's no database:
all game state lives in the browser.
