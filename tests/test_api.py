from fastapi.testclient import TestClient

from backend.main import app
from backend import recommender

client = TestClient(app)


def post(goal, skills=None, path_id=None):
    return client.post("/recommend", json={"goal": goal, "known_skills": skills or [], "path_id": path_id})


def test_all_prerequisites_exist_and_no_cycles():
    for path in recommender.learning_paths:
        ids = {t["id"] for t in path["topics"]}
        for t in path["topics"]:
            assert set(t["prerequisites"]) <= ids, (path["id"], t["id"])
        ordered, _, _ = recommender.order_topics(path["topics"])
        assert len(ordered) == len(path["topics"])


def test_goal_matching():
    cases = {
        "I want to learn deep learning and build AI models": "deep-learning",
        "I want to build websites with React": "web-development",
        "analyse data with pandas and statistics": "data-science",
        "crack coding interviews, leetcode problems": "dsa",
        "learn docker kubernetes and deploy to aws": "devops-cloud",
        "build android and ios apps": "mobile-react-native",
        "become an ethical hacker": "cybersecurity",
    }
    for goal, expected in cases.items():
        assert post(goal).json()["path_id"] == expected, goal


def test_roadmap_respects_prerequisites():
    data = post("learn web development").json()
    seen = set(data["known_topics_skipped"] + data["implied_topics_skipped"])
    for topic in data["roadmap"]:
        assert set(topic["prerequisites"]) <= seen
        seen.add(topic["id"])


def test_known_skill_skips_topic_and_prereqs():
    data = post("learn web development", ["React"]).json()
    ids = [t["id"] for t in data["roadmap"]]
    assert "react" not in ids
    assert "javascript" not in ids and "html-css" not in ids  # implied
    assert "backend" in ids


def test_java_does_not_match_javascript():
    topics = recommender.paths_by_id["web-development"]["topics"]
    assert recommender.find_known_topics(topics, ["Java"]) == set()


def test_force_path_and_alternatives():
    data = post("learn web development", path_id="cybersecurity").json()
    assert data["path_id"] == "cybersecurity"
    assert data["alternatives"]


def test_validation():
    assert post("").status_code == 422
    assert post("x").status_code == 422
    assert post("anything", path_id="nope").status_code == 400


def test_meta_endpoints():
    assert len(client.get("/paths").json()) == len(recommender.learning_paths)
    assert "Python" in client.get("/skills").json()
    assert client.get("/health").json()["status"] == "ok"
