from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import sys
import os

# Add parent directory to sys.path to import pipeline
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import run_research_pipeline_stream
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    topic: str

@app.post("/api/research")
async def research_endpoint(req: ResearchRequest, request: Request):
    async def event_generator():
        # Await the async generator to get yielded items
        async for msg in run_research_pipeline_stream(req.topic):
            # If client disconnects, stop generating
            if await request.is_disconnected():
                break
            yield msg
    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
