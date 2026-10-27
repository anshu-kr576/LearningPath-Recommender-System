export default function Overview({ paths, onPick }) {
  return (
    <section className="overview">
      <h2>Start from a goal</h2>
      <p className="muted">
        Describe what you want to learn on the left and you'll get an ordered
        roadmap with time estimates, dates and resources. Or begin with one of
        the paths we cover:
      </p>
      <ul className="path-grid">
        {paths.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)}>
              <span className="path-code">{p.icon}</span>
              <span className="path-name">{p.title}</span>
              <span className="path-info">
                {p.topic_count} topics, {p.total_hours} h
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
