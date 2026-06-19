from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
import sys
import os
from typing import Optional

# Add parent directory to sys.path to import pipeline
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from pipeline import run_research_pipeline_stream
from pydantic import BaseModel
import database

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
    user_id: Optional[int] = None

class ChatRequest(BaseModel):
    report: str
    question: str

class AuthRequest(BaseModel):
    email: str
    password: str

@app.post("/api/signup")
def signup(req: AuthRequest):
    user_id = database.create_user(req.email, req.password)
    if not user_id:
        raise HTTPException(status_code=400, detail="Email already registered")
    return {"id": user_id, "email": req.email}

@app.post("/api/login")
def login(req: AuthRequest):
    user = database.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@app.get("/api/history")
def get_history(user_id: int):
    return database.get_history(user_id)

@app.post("/api/research")
async def research_endpoint(req: ResearchRequest, request: Request):
    async def event_generator():
        final_result = None
        # Await the async generator to get yielded items
        async for msg in run_research_pipeline_stream(req.topic):
            import json
            try:
                # msg is just the raw JSON string yielded by the pipeline
                if isinstance(msg, str):
                    # In case it has a 'data: ' prefix by some middle layer
                    raw_str = msg[6:] if msg.startswith("data: ") else msg
                    data = json.loads(raw_str.strip())
                    if data.get("step") == "writer" and data.get("status") == "done":
                        final_result = data.get("result")
                elif isinstance(msg, dict):
                    data = json.loads(msg.get("data", "{}"))
                    if data.get("step") == "writer" and data.get("status") == "done":
                        final_result = data.get("result")
            except Exception as e:
                pass
            # If client disconnects, stop generating
            if await request.is_disconnected():
                break
            yield msg
            
        if req.user_id and final_result:
            database.add_history(req.user_id, req.topic, final_result)
            
    return EventSourceResponse(event_generator())

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest, request: Request):
    from pipeline import run_chat_stream
    async def event_generator():
        async for msg in run_chat_stream(req.report, req.question):
            if await request.is_disconnected():
                break
            yield msg
    return EventSourceResponse(event_generator())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
