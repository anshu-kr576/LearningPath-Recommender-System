import { useState } from "react";
import { formatRange } from "../lib/schedule";

export default function TopicCard({
  topic,
  index,
  slot,
  done,
  isNext,
  note,
  onToggle,
  onNote,
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className={`topic ${done ? "done" : ""} ${isNext ? "next" : ""}`}>
      <div className="marker" aria-hidden="true">
        {done ? "✓" : index + 1}
      </div>

      <div className="topic-body">
        <div className="topic-head">
          <h3>{topic.title}</h3>
          {isNext && <span className="tag tag-next">Up next</span>}
        </div>

        <p className="topic-meta">
          <span className={`level level-${topic.difficulty?.toLowerCase()}`}>{topic.difficulty}</span>
          <span>{topic.estimated_hours} h</span>
          <span>{formatRange(slot)}</span>
        </p>

        <p className="topic-desc">{topic.description}</p>

        {topic.resources?.length > 0 && (
          <ul className="resources">
            {topic.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.name}
                </a>
                {r.type && <span className="res-type">{r.type}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="topic-actions">
          <label className="check">
            <input type="checkbox" checked={done} onChange={onToggle} />
            {done ? "Completed" : "Mark as done"}
          </label>
          <button type="button" className="link-button" onClick={() => setOpen(!open)}>
            {note?.trim() ? "Edit note" : "Add note"}
          </button>
        </div>

        {(open || note?.trim()) && (
          <textarea
            className="note"
            rows={2}
            value={note || ""}
            placeholder="Notes, doubts, links..."
            aria-label={`Notes for ${topic.title}`}
            onChange={(e) => onNote(e.target.value)}
          />
        )}
      </div>
    </li>
  );
}
