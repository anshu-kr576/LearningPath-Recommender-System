"""Recommendation engine.

* Goal -> learning path matching uses SBERT sentence embeddings. If
  sentence-transformers is not installed (or the model can't be downloaded)
  it falls back to TF-IDF so the app still works offline.
* Known skills are matched against topic titles / keywords with whole-word
  matching, and anything that is a prerequisite of a known topic is skipped too.
* Remaining topics are ordered with a topological sort (prerequisites first)
  and grouped into stages.
"""

import json
import re
from functools import lru_cache
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "learning_paths.json"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Score thresholds (cosine similarity) used to label how sure we are.
HIGH_CONFIDENCE = 0.45
LOW_CONFIDENCE = 0.25


# --------------------------------------------------------------------------
# Data
# --------------------------------------------------------------------------
def normalize(text: str) -> str:
    """Lowercase and strip punctuation so 'Node.js' == 'node js'."""
    return re.sub(r"[^a-z0-9+#]+", " ", text.lower()).strip()


def load_learning_paths():
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


learning_paths = load_learning_paths()
paths_by_id = {p["id"]: p for p in learning_paths}


def path_text(path):
    """The text that represents a path in embedding space."""
    topics = ", ".join(t["title"] for t in path["topics"])
    tags = ", ".join(path.get("tags", []))
    return f"{path['title']}. {path['description']} Topics: {topics}. Related: {tags}."


path_texts = [path_text(p) for p in learning_paths]


def list_paths():
    """Short summary of every path (for the UI)."""
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "description": p["description"],
            "icon": p.get("icon", ""),
            "topic_count": len(p["topics"]),
            "total_hours": sum(t.get("estimated_hours", 0) for t in p["topics"]),
        }
        for p in learning_paths
    ]


SKILL_LABELS = {
    "html": "HTML and CSS", "ci cd": "CI/CD", "owasp": "Web Security (OWASP)",
    "pytorch": "PyTorch", "big o": "Big-O Complexity", "pentest": "Penetration Testing",
    "api": "REST APIs", "linked list": "Linked Lists", "math": "Maths for ML",
    "javascript": "JavaScript", "programming": "Programming Basics",
    "git and version control": "Git", "aws": "AWS",
}
HIDDEN_SKILLS = {"publishing", "api", "cloud fundamentals (aws)", "networking and local storage"}


def list_skills():
    """Distinct skills a user can pick from, derived from the dataset keywords."""
    labels = {}
    for path in learning_paths:
        for topic in path["topics"]:
            key = normalize((topic.get("keywords") or [topic["title"]])[0])
            if key in HIDDEN_SKILLS:
                continue
            labels.setdefault(key, SKILL_LABELS.get(key, key.title()))
    labels.setdefault("aws", "AWS")
    labels.setdefault("git", "Git")
    popular = ["Python", "JavaScript", "HTML and CSS", "React", "Git", "Linux",
               "Machine Learning", "Statistics", "Docker", "Programming Basics",
               "Backend", "Networking"]
    values = set(labels.values())
    return [s for s in popular if s in values] + sorted(values - set(popular))


# --------------------------------------------------------------------------
# Embedding engine (SBERT with TF-IDF fallback)
# --------------------------------------------------------------------------
class Engine:
    def __init__(self):
        self.name = "tfidf"
        self.model = None
        self.vectorizer = None
        self.matrix = None
        self._load()

    def _load(self):
        try:
            from sentence_transformers import SentenceTransformer

            print("Loading SBERT model...")
            self.model = SentenceTransformer(MODEL_NAME)
            self.matrix = self.model.encode(path_texts, normalize_embeddings=True)
            self.name = "sbert"
        except Exception as error:  # ImportError, network error, ...
            print(f"SBERT unavailable ({type(error).__name__}); using TF-IDF fallback.")
            self.vectorizer = TfidfVectorizer(
                ngram_range=(1, 2), stop_words="english", sublinear_tf=True
            )
            self.matrix = self.vectorizer.fit_transform(path_texts)
        print(f"Recommendation engine ready ({self.name}).")

    def scores(self, goal: str) -> np.ndarray:
        if self.model is not None:
            vec = self.model.encode([goal], normalize_embeddings=True)
        else:
            vec = self.vectorizer.transform([goal])
        return cosine_similarity(vec, self.matrix)[0]


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return Engine()


def tag_boost(goal: str, path) -> float:
    """Small bonus when the goal literally mentions one of the path's tags."""
    text = f" {normalize(goal)} "
    hits = sum(1 for tag in path.get("tags", []) if f" {normalize(tag)} " in text)
    return min(0.1 * hits, 0.2)


def rank_paths(goal: str, top_k: int = 3):
    """Return the top_k best matching paths as (path, score) tuples."""
    if not goal or not goal.strip():
        raise ValueError("Please enter a learning goal.")

    base = get_engine().scores(goal)
    scored = [
        (path, float(base[i]) + tag_boost(goal, path))
        for i, path in enumerate(learning_paths)
    ]
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored[:top_k]


def confidence_label(score: float) -> str:
    if score >= HIGH_CONFIDENCE:
        return "high"
    if score >= LOW_CONFIDENCE:
        return "medium"
    return "low"


# --------------------------------------------------------------------------
# Known skills + ordering
# --------------------------------------------------------------------------
def _contains_phrase(haystack: str, phrase: str) -> bool:
    return f" {phrase} " in f" {haystack} "


def find_known_topics(topics, known_skills):
    """Topics the user already knows (whole-word match, so 'java' != 'javascript')."""
    known = [normalize(s) for s in known_skills if s and s.strip()]
    known_ids = set()

    for topic in topics:
        names = {normalize(topic["id"]), normalize(topic["title"])}
        names.update(normalize(k) for k in topic.get("keywords", []))

        for skill in known:
            if skill in names or any(_contains_phrase(n, skill) for n in names if len(skill) > 2):
                known_ids.add(topic["id"])
                break
    return known_ids


def prerequisite_closure(topics, ids):
    """All topics that are (transitively) prerequisites of the given ids."""
    by_id = {t["id"]: t for t in topics}
    seen, stack = set(), list(ids)
    while stack:
        current = stack.pop()
        for pre in by_id.get(current, {}).get("prerequisites", []):
            if pre not in seen and pre in by_id:
                seen.add(pre)
                stack.append(pre)
    return seen


def order_topics(topics, known_skills=None):
    """Order topics so prerequisites always come first.

    Returns (ordered_topics, explicit_skipped_ids, implied_skipped_ids).
    Each returned topic gets a 1-based `stage` (topics in the same stage don't
    depend on each other).
    """
    known_ids = find_known_topics(topics, known_skills or [])
    implied_ids = prerequisite_closure(topics, known_ids) - known_ids

    completed = known_ids | implied_ids
    remaining = [t for t in topics if t["id"] not in completed]
    ordered, stage = [], 0

    while remaining:
        ready = [
            t for t in remaining
            if all(p in completed for p in t["prerequisites"])
        ]
        if not ready:
            raise ValueError(
                "Unable to order topics. Check prerequisite IDs "
                "for missing or circular dependencies."
            )
        stage += 1
        for topic in ready:
            ordered.append({**topic, "stage": stage})
            remaining.remove(topic)
        completed.update(t["id"] for t in ready)

    return ordered, sorted(known_ids), sorted(implied_ids)


def generate_roadmap(goal, known_skills=None, path_id=None):
    """Match a goal to a path and build the personalised roadmap."""
    known_skills = known_skills or []
    ranked = rank_paths(goal, top_k=3)

    if path_id:
        if path_id not in paths_by_id:
            raise ValueError(f"Unknown path '{path_id}'.")
        path = paths_by_id[path_id]
        score = next((s for p, s in ranked if p["id"] == path_id), None)
        if score is None:
            score = next(
                s for p, s in rank_paths(goal, top_k=len(learning_paths)) if p["id"] == path_id
            )
    else:
        path, score = ranked[0]

    ordered, skipped, implied = order_topics(path["topics"], known_skills)
    skipped_titles = {t["id"]: t["title"] for t in path["topics"]}

    return {
        "goal": goal,
        "path_id": path["id"],
        "recommended_path": path["title"],
        "path_description": path["description"],
        "similarity_score": round(score, 4),
        "confidence": confidence_label(score),
        "engine": get_engine().name,
        "alternatives": [
            {"id": p["id"], "title": p["title"], "score": round(s, 4)}
            for p, s in ranked
            if p["id"] != path["id"]
        ],
        "known_topics_skipped": skipped,
        "implied_topics_skipped": implied,
        "skipped_titles": {i: skipped_titles[i] for i in skipped + implied},
        "total_hours": sum(t.get("estimated_hours", 0) for t in ordered),
        "roadmap": ordered,
    }


if __name__ == "__main__":
    result = generate_roadmap(
        goal="I want to learn Deep Learning and build AI models",
        known_skills=["Python"],
    )
    print("\nRecommended Path:", result["recommended_path"], f"({result['confidence']})")
    print("Similarity Score:", result["similarity_score"])
    print("Skipped Topics:", result["known_topics_skipped"], result["implied_topics_skipped"])
    print("\nPersonalized Roadmap:")
    for number, topic in enumerate(result["roadmap"], start=1):
        print(f"{number}. [{topic['stage']}] {topic['title']} ({topic['estimated_hours']}h)")
