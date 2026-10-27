# LearnPath - Learning Path Recommendation System

Type a learning goal, mark what you already know, and get an ordered study roadmap
with time estimates, calendar dates and resources.

## What's inside

**Backend (FastAPI)**
- Goal to path matching with SBERT embeddings (`all-MiniLM-L6-v2`) plus a small tag boost. Falls back to TF-IDF automatically if `sentence-transformers` isn't installed or the model can't be downloaded.
- 7 learning paths: Deep Learning, Web Development, Data Science, DSA, DevOps & Cloud, Mobile Apps, Cybersecurity (edit `data/learning_paths.json` to add more).
- Smarter skill matching: whole-word matching (so "Java" no longer skips "JavaScript"), and prerequisites of a skill you know are skipped too (know React, skip JavaScript and HTML/CSS).
- Topological ordering with prerequisite/cycle checks, difficulty level and resource types per topic.
- Match confidence, top alternative paths, and the option to force a path.
- Endpoints: `POST /recommend`, `GET /paths`, `GET /skills`, `GET /health`. Tests in `tests/`.

**Frontend (React + Vite)**
- Redesigned, calmer UI with light and dark theme, responsive layout and print styles.
- Study planner: hours per day, start date, optional weekends-off, per-topic dates and a finish date that update live.
- Progress saved per path in the browser, per-topic notes, "Up next" highlight, All / Remaining / Done filter, reset progress.
- Not the path you meant? One click to switch to an alternative match.
- Export the roadmap as Markdown, or print it.

## Run it

```bash
# 1. backend (from the project root)
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload                      # http://127.0.0.1:8000

# 2. frontend (new terminal)
cd frontend
npm install
npm run dev                                            # http://localhost:5173
```

The first start downloads the SBERT model (about 90 MB). `GET /health` shows which engine is active.

Optional config: `CORS_ORIGINS` (backend, comma separated) and `VITE_API_URL` (frontend, default `http://127.0.0.1:8000`).

## Tests

```bash
pytest
```

## Adding a path

Add an object to `data/learning_paths.json` with `id`, `title`, `description`, `tags` and `topics`. Each topic needs `id`, `title`, `description`, `estimated_hours`, `difficulty`, `prerequisites` (topic ids), `keywords` (names a user might type for this skill) and `resources`. `pytest` checks that prerequisites exist and there are no cycles.
