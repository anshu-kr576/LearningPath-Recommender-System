const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(
      "Can't reach the backend. Start it with: uvicorn backend.main:app --reload"
    );
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? "Please check the goal you entered (2 to 500 characters)."
      : data.detail;
    throw new Error(detail || "Something went wrong. Try again.");
  }
  return data;
}

export const fetchPaths = () => request("/paths");
export const fetchSkills = () => request("/skills");

export const recommend = ({ goal, knownSkills, pathId }) =>
  request("/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal,
      known_skills: knownSkills,
      path_id: pathId || null,
    }),
  });
