from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.database import engine
from app.models import Base
from app.seed import seed_db
from app.routers import auth, projects, tasks, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables then seed on startup
    Base.metadata.create_all(bind=engine)
    seed_db()
    yield


app = FastAPI(title="TaskFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Return {"error": "..."} instead of FastAPI's default {"detail": "..."}
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})


# Map Pydantic validation errors to {"fields": {"field": "message"}}
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    fields = {}
    for error in exc.errors():
        field = str(error["loc"][-1]) if error["loc"] else "general"
        fields[field] = error["msg"]
    return JSONResponse(status_code=422, content={"fields": fields})


app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(users.router)
