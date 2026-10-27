const DAY = 24 * 60 * 60 * 1000;

export function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar date of the n-th study day (0-based), optionally skipping weekends. */
function studyDate(start, n, weekends) {
  const date = new Date(start);
  if (weekends) return new Date(date.getTime() + n * DAY);
  // roll start forward to a weekday, then count weekdays only
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  let left = n;
  while (left > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) left--;
  }
  return date;
}

/**
 * Give every topic a start/end date from its estimated hours.
 * Returns { items: [{ id, startDay, endDay, start, end }], totalDays, finish }.
 */
export function buildSchedule(roadmap, hoursPerDay, startISO, weekends) {
  const start = parseISO(startISO || todayISO());
  const perDay = Math.max(0.5, hoursPerDay);
  let before = 0;

  const items = roadmap.map((topic) => {
    const hours = topic.estimated_hours ?? 0;
    const startDay = Math.floor(before / perDay);
    before += hours;
    const endDay = Math.max(startDay, Math.ceil(before / perDay) - 1);
    return {
      id: topic.id,
      startDay,
      endDay,
      start: studyDate(start, startDay, weekends),
      end: studyDate(start, endDay, weekends),
    };
  });

  const last = items[items.length - 1];
  return {
    items,
    totalDays: last ? last.endDay + 1 : 0,
    finish: last ? last.end : null,
  };
}

export function formatDate(date) {
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function formatRange(item) {
  const a = formatDate(item.start);
  const b = formatDate(item.end);
  return a === b ? a : `${a} - ${b}`;
}

export function formatFinish(date) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
