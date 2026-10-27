import { useMemo, useState } from "react";
import TopicCard from "./TopicCard";
import { formatFinish } from "../lib/schedule";

const FILTERS = [
  ["all", "All"],
  ["todo", "Remaining"],
  ["done", "Done"],
];

export default function Roadmap({
  result,
  schedule,
  completed,
  notes,
  hoursPerDay,
  loading,
  onToggle,
  onNote,
  onSwitchPath,
  onExport,
  onPrint,
  onReset,
}) {
  const [filter, setFilter] = useState("all");
  const done = new Set(completed);
  const total = result.roadmap.length;
  const doneCount = result.roadmap.filter((t) => done.has(t.id)).length;
  const progress = total ? Math.round((doneCount / total) * 100) : 0;
  const hoursLeft = result.roadmap
    .filter((t) => !done.has(t.id))
    .reduce((sum, t) => sum + t.estimated_hours, 0);
  const nextId = result.roadmap.find((t) => !done.has(t.id))?.id;
  const slots = useMemo(
    () => Object.fromEntries(schedule.items.map((s) => [s.id, s])),
    [schedule]
  );

  const skipped = [...result.known_topics_skipped, ...result.implied_topics_skipped];

  // group by stage so parallel-ready topics are visibly grouped
  const visible = result.roadmap
    .map((topic, index) => ({ topic, index }))
    .filter(({ topic }) =>
      filter === "all" ? true : filter === "done" ? done.has(topic.id) : !done.has(topic.id)
    );

  return (
    <article className="result">
      <header className="result-head">
        <div>
          <p className="eyebrow">Recommended path</p>
          <h2>{result.recommended_path}</h2>
          <p className="muted">{result.path_description}</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn-secondary" onClick={onExport}>Download .md</button>
          <button type="button" className="btn-secondary" onClick={onPrint}>Print</button>
        </div>
      </header>

      {result.confidence === "low" && (
        <p className="notice">
          Your goal doesn't closely match any path (match {Math.round(result.similarity_score * 100)}%).
          Pick a better fit below or describe your goal in more detail.
        </p>
      )}

      {(result.alternatives.length > 0 || result.confidence !== "high") && (
        <div className="alternatives">
          <span className="muted">Not quite right? Try:</span>
          {result.alternatives.map((alt) => (
            <button
              type="button"
              key={alt.id}
              className="chip"
              disabled={loading}
              onClick={() => onSwitchPath(alt.id)}
            >
              {alt.title}
            </button>
          ))}
        </div>
      )}

      <dl className="stats">
        <div>
          <dt>Topics</dt>
          <dd>{total}</dd>
        </div>
        <div>
          <dt>Total time</dt>
          <dd>{result.total_hours} h</dd>
        </div>
        <div>
          <dt>Finish by</dt>
          <dd>{schedule.finish ? formatFinish(schedule.finish) : "-"}</dd>
        </div>
        <div>
          <dt>Left</dt>
          <dd>{hoursLeft} h</dd>
        </div>
      </dl>
      <p className="muted small">
        {schedule.totalDays} study days at {hoursPerDay} h/day.
        {skipped.length > 0 && ` ${skipped.length} topic${skipped.length > 1 ? "s" : ""} skipped because you already know them.`}
      </p>

      <div className="progress">
        <div className="progress-label">
          <span>
            {doneCount} of {total} done
          </span>
          <strong>{progress}%</strong>
        </div>
        <div
          className="track"
          role="progressbar"
          aria-label="Roadmap progress"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {progress === 100 && total > 0 && (
        <p className="notice success">You've finished this roadmap. Nice work.</p>
      )}

      <div className="toolbar">
        <div className="tabs" role="tablist" aria-label="Filter topics">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {doneCount > 0 && (
          <button type="button" className="link-button" onClick={onReset}>
            Reset progress
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="muted empty-filter">Nothing here yet.</p>
      ) : (
        <ol className="timeline">
          {visible.map(({ topic, index }) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={index}
              slot={slots[topic.id]}
              done={done.has(topic.id)}
              isNext={topic.id === nextId}
              note={notes[topic.id]}
              onToggle={() => onToggle(topic.id)}
              onNote={(text) => onNote(topic.id, text)}
            />
          ))}
        </ol>
      )}

      {skipped.length > 0 && (
        <details className="skipped">
          <summary>Skipped topics ({skipped.length})</summary>
          <ul>
            {skipped.map((id) => (
              <li key={id}>
                {result.skipped_titles[id]}
                {result.implied_topics_skipped.includes(id) && (
                  <span className="muted"> (required for something you know)</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
