import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend import recommender


@asynccontextmanager
async def lifespan(app: FastAPI):
    recommender.get_engine()  # load the model once at startup
    yield


app = FastAPI(
    title="Learning Path Recommendation System",
    description="Personalized learning roadmaps using SBERT",
    version="2.0.0",
    lifespan=lifespan,
)

# Extra origins can be added with: CORS_ORIGINS="https://my-site.com,https://other.com"
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *[o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()],
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendationRequest(BaseModel):
    goal: str = Field(min_length=2, max_length=500, description="The user's learning goal")
    known_skills: list[str] = Field(default_factory=list, max_length=50)
    path_id: str | None = Field(
        default=None, description="Force a specific path instead of the best match"
    )


@app.get("/")
def home():
    return {"message": "Learning Path Recommendation API is running!"}


@app.get("/health")
def health():
    return {"status": "ok", "engine": recommender.get_engine().name}


@app.get("/paths")
def paths():
    return recommender.list_paths()


@app.get("/skills")
def skills():
    return recommender.list_skills()


@app.post("/recommend")
def recommend(request: RecommendationRequest):
    try:
        return recommender.generate_roadmap(
            goal=request.goal.strip(),
            known_skills=request.known_skills,
            path_id=request.path_id,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
