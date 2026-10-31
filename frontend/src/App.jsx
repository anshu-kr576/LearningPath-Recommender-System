import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { fetchPaths, fetchSkills, recommend } from "./api";
import PlannerForm from "./components/PlannerForm";
import Roadmap from "./components/Roadmap";
import Overview from "./components/Overview";
import { buildSchedule, todayISO } from "./lib/schedule";
import { toMarkdown, download } from "./lib/export";
import * as store from "./lib/storage";

const DEFAULT_FORM = {
  goal: "",
  knownSkills: [],
  hoursPerDay: 2,
  startDate: todayISO(),
  weekends: true,
};

export default function App() {
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...store.read("form", {}),
    startDate: todayISO(),
  }));
  const [skillOptions, setSkillOptions] = useState([]);
  const [paths, setPaths] = useState([]);
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState({ completed: [], notes: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light"
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    store.write("theme", theme);
  }, [theme]);

  useEffect(() => {
    store.write("form", {
      goal: form.goal,
      knownSkills: form.knownSkills,
      hoursPerDay: form.hoursPerDay,
      weekends: form.weekends,
    });
  }, [form]);

  useEffect(() => {
    fetchSkills().then(setSkillOptions).catch(() => {});
    fetchPaths().then(setPaths).catch(() => {});
  }, []);

  // progress is stored per path, so it survives rewording the goal
  const progressKey = result ? `progress-${result.path_id}` : null;

  function saveProgress(next) {
    setProgress(next);
    if (progressKey) store.write(progressKey, next);
  }

  const run = useCallback(
    async (pathId, goalOverride) => {
      setLoading(true);
      setError("");
      try {
        const data = await recommend({
          goal: (goalOverride ?? form.goal).trim(),
          knownSkills: form.knownSkills,
          pathId,
        });
        setProgress(store.read(`progress-${data.path_id}`, { completed: [], notes: {} }));
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [form.goal, form.knownSkills]
  );

  function handleSubmit(event) {
    event.preventDefault();
    run(null);
  }

  function pickPath(path) {
    const goal = form.goal.trim().length >= 2 ? form.goal : `I want to learn ${path.title}`;
    setForm((prev) => ({ ...prev, goal }));
    run(path.id, goal);
  }

  const schedule = useMemo(
    () =>
      result
        ? buildSchedule(result.roadmap, form.hoursPerDay, form.startDate, form.weekends)
        : null,
    [result, form.hoursPerDay, form.startDate, form.weekends]
  );

  function toggleTopic(id) {
    const completed = progress.completed.includes(id)
      ? progress.completed.filter((x) => x !== id)
      : [...progress.completed, id];
    saveProgress({ ...progress, completed });
  }

  function setNote(id, text) {
    saveProgress({ ...progress, notes: { ...progress.notes, [id]: text } });
  }

  function resetProgress() {
    if (window.confirm("Clear all completed topics for this path?")) {
      saveProgress({ ...progress, completed: [] });
    }
  }

  function exportMarkdown() {
    download(
      `${result.path_id}-roadmap.md`,
      toMarkdown({
        result,
        schedule,
        completed: progress.completed,
        notes: progress.notes,
        hoursPerDay: form.hoursPerDay,
      })
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/" aria-label="LearnPath home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M6 5v14h12M6 12h8M6 5h6" />
              </svg>
            </span>
            <span>learnpath<span className="brand-period">.</span></span>
          </a>
          <nav className="nav-links" aria-label="Main navigation">
            <a href="#paths">Explore paths</a>
            <a href="#plan-builder">Build a plan</a>
          </nav>
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <span aria-hidden="true">{theme === "dark" ? "☼" : "◐"}</span>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="hero-badge">
            <span className="badge-spark" aria-hidden="true">✦</span>
            A clearer way to learn
          </p>
          <h1 id="hero-title">
            Big goals.
            <br />
            <span>A path to get there.</span>
          </h1>
          <p className="hero-description">
            Turn what you want to learn into a focused roadmap, built around
            your skills, your schedule, and your pace.
          </p>
          <a className="hero-cta" href="#plan-builder">
            Create your learning path <span aria-hidden="true">↗</span>
          </a>
          <div className="hero-highlights" aria-label="Planner features">
            <span><i aria-hidden="true">✓</i> Skill-aware recommendations</span>
            <span><i aria-hidden="true">✓</i> A schedule that fits your life</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-outer" />
          <div className="hero-orbit orbit-inner" />
          <div className="hero-spark spark-one">✦</div>
          <div className="hero-spark spark-two">✧</div>
          <div className="hero-emblem">
            <div className="emblem-ring">
              <svg viewBox="0 0 120 120" fill="none">
                <path d="M38 81V39c0-3 3-5 6-3l16 12 16-12c3-2 6 0 6 3v42" />
                <path d="M47 64h26M51 74h18" />
              </svg>
            </div>
            <span>Make progress<br />feel possible</span>
          </div>
        </div>
      </section>

      <main className="layout">
        <aside className="sidebar">
          <PlannerForm
            form={form}
            setForm={setForm}
            skillOptions={skillOptions}
            loading={loading}
            onSubmit={handleSubmit}
          />
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
        </aside>

        <section className="content" aria-live="polite">
          {result && schedule ? (
            <Roadmap
              result={result}
              schedule={schedule}
              completed={progress.completed}
              notes={progress.notes}
              hoursPerDay={form.hoursPerDay}
              loading={loading}
              onToggle={toggleTopic}
              onNote={setNote}
              onSwitchPath={run}
              onExport={exportMarkdown}
              onPrint={() => window.print()}
              onReset={resetProgress}
            />
          ) : (
            <Overview paths={paths} onPick={pickPath} />
          )}
        </section>
      </main>

      <footer className="footer">
        <span className="footer-mark" aria-hidden="true">✦</span>
        Matches are made with sentence embeddings (SBERT). Progress is saved in your browser.
      </footer>
    </div>
  );
}
