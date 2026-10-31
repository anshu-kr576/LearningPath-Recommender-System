export default function Overview({ paths, onPick }) {
  return (
    <section className="overview" id="paths" aria-labelledby="paths-title">
      <div className="overview-heading">
        <span className="section-index">02 <span>/</span> GET STARTED</span>
        <h2 id="paths-title">Choose a place to begin</h2>
      </div>
      <p className="muted">
        Pick a curated path or describe your own learning goal. Your roadmap
        will include a suggested order, time estimates, dates, and resources.
      </p>
      <ul className="path-grid">
        {paths.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onPick(p)}>
              <span className="path-card-top">
                <span className="path-code">{p.icon}</span>
                <span className="path-arrow" aria-hidden="true">↗</span>
              </span>
              <span className="path-name">{p.title}</span>
              <span className="path-info">{p.topic_count} topics <i /> {p.total_hours} hours</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
