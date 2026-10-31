import { useState } from "react";

const EXAMPLES = [
  "I want to learn deep learning and build AI models",
  "Become a full stack web developer",
  "Crack coding interviews with DSA",
  "Deploy apps with Docker and AWS",
];

export default function PlannerForm({
  form,
  setForm,
  skillOptions,
  loading,
  onSubmit,
}) {
  const [custom, setCustom] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { goal, knownSkills, hoursPerDay, startDate, weekends } = form;
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  function toggleSkill(skill) {
    update({
      knownSkills: knownSkills.includes(skill)
        ? knownSkills.filter((s) => s !== skill)
        : [...knownSkills, skill],
    });
  }

  function addCustom(event) {
    event.preventDefault();
    const value = custom.trim();
    if (value && !knownSkills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      update({ knownSkills: [...knownSkills, value] });
    }
    setCustom("");
  }

  // custom skills the user typed that are not in the quick-pick list
  const extra = knownSkills.filter((s) => !skillOptions.includes(s));

  return (
    <form className="planner" id="plan-builder" onSubmit={onSubmit}>
      <div className="planner-heading">
        <span className="section-index">01 <span>/</span> YOUR GOAL</span>
        <h2 className="panel-title">Build your plan</h2>
        <p className="planner-intro">A few details help us shape a path that feels like yours.</p>
      </div>

      <label htmlFor="goal">What do you want to learn?</label>
      <textarea
        id="goal"
        rows={3}
        value={goal}
        maxLength={500}
        required
        minLength={2}
        placeholder="e.g. I want to become a data analyst"
        onChange={(e) => update({ goal: e.target.value })}
      />
      <div className="examples">
        {EXAMPLES.map((text) => (
          <button type="button" key={text} className="link-button" onClick={() => update({ goal: text })}>
            {text}
          </button>
        ))}
      </div>

      <label>What do you already know?</label>
      <div className="chips">
        {[...(showAll ? skillOptions : skillOptions.slice(0, 12)), ...extra].map((skill) => {
          const on = knownSkills.includes(skill);
          return (
            <button
              type="button"
              key={skill}
              className={`chip ${on ? "on" : ""}`}
              aria-pressed={on}
              onClick={() => toggleSkill(skill)}
            >
              {skill}
            </button>
          );
        })}
      </div>
      {skillOptions.length > 12 && (
        <button type="button" className="link-button" onClick={() => setShowAll(!showAll)}>
          {showAll ? "Show fewer" : `Show all ${skillOptions.length} skills`}
        </button>
      )}
      <div className="inline-add">
        <input
          type="text"
          value={custom}
          placeholder="Add another skill"
          aria-label="Add another skill"
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom(e)}
        />
        <button type="button" className="btn-secondary" onClick={addCustom}>
          Add
        </button>
      </div>

      <div className="field-row">
        <div>
          <label htmlFor="hours">Time per day</label>
          <div className="range-row">
            <input
              id="hours"
              type="range"
              min="0.5"
              max="8"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => update({ hoursPerDay: Number(e.target.value) })}
            />
            <output>{hoursPerDay} h</output>
          </div>
        </div>
        <div>
          <label htmlFor="start">Start date</label>
          <input
            id="start"
            type="date"
            value={startDate}
            onChange={(e) => update({ startDate: e.target.value })}
          />
        </div>
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={weekends}
          onChange={(e) => update({ weekends: e.target.checked })}
        />
        Study on weekends too
      </label>

      <button className="btn-primary" disabled={loading || goal.trim().length < 2}>
        {loading ? "Building roadmap..." : "Build my roadmap"}
      </button>
    </form>
  );
}
