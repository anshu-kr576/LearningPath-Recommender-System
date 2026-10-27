import { formatRange } from "./schedule";

export function toMarkdown({ result, schedule, completed, notes, hoursPerDay }) {
  const done = new Set(completed);
  const byId = Object.fromEntries(schedule.items.map((s) => [s.id, s]));
  const lines = [
    `# ${result.recommended_path} roadmap`,
    "",
    `Goal: ${result.goal}`,
    `Plan: ${result.total_hours} hours at ${hoursPerDay} h/day (about ${schedule.totalDays} study days)`,
    "",
  ];

  result.roadmap.forEach((topic, i) => {
    lines.push(
      `## ${i + 1}. ${topic.title}`,
      `- [${done.has(topic.id) ? "x" : " "}] ${topic.estimated_hours} h, ${topic.difficulty}, ${formatRange(byId[topic.id])}`,
      "",
      topic.description,
      ""
    );
    topic.resources?.forEach((r) => lines.push(`- ${r.name}: ${r.url}`));
    if (notes[topic.id]?.trim()) lines.push("", `Notes: ${notes[topic.id].trim()}`);
    lines.push("");
  });

  return lines.join("\n");
}

export function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
