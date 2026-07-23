# Cognigy Assessment — Quiz Site

A static, self-contained quiz app. No backend, no build step.

## Files
- `index.html` — page structure
- `style.css` — styling
- `script.js` — quiz logic (random question draw, timer, scoring)
- `questions.json` — the 299-question bank, converted from your Excel file

## How it works
- Each participant who opens the page gets their own random 50 questions
  (Fisher-Yates shuffle), with shuffled answer options. Since the draw
  happens independently in each participant's browser, everyone's set
  will differ.
- 60-minute timer, auto-submits when time runs out.
- Score, correct/wrong/unanswered counts, and full answer review are
  shown immediately after submission — all client-side, nothing is sent
  anywhere.

## Deploying to GitHub Pages
1. Create a new GitHub repository (public, or private with Pages enabled on your plan).
2. Upload all 4 files (`index.html`, `style.css`, `script.js`, `questions.json`) to the repo root.
3. Go to **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch".
5. Choose the branch (usually `main`) and folder `/root`, then **Save**.
6. GitHub will give you a URL like `https://yourusername.github.io/your-repo-name/` — that's the link to send to your 40 staff.
7. It can take a minute or two to go live after the first deploy.

## Testing locally before deploying
Opening `index.html` directly by double-clicking it will **not** work —
browsers block a local page from fetching `questions.json` off disk for
security reasons. To test locally, run a simple local server from this
folder and open the printed address:

```
python3 -m http.server 8000
```
then visit `http://localhost:8000` in your browser.

## Adjusting settings
Open `script.js` and edit the constants at the top:
```js
const QUESTIONS_PER_PARTICIPANT = 50;
const DURATION_MINUTES = 60;
const PASSING_PERCENT = 70;
```

## Note on results
This is a fully static site — there's no server collecting scores
centrally. Each participant sees their own result on screen at the end;
there's no built-in way to gather everyone's scores automatically. If
you need a live leaderboard/admin view of everyone's results, that
requires a backend and is a different kind of build — let me know if
you want that instead.
