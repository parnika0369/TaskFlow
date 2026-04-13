from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.auth import hash_password, verify_password, create_token
from app.schemas import RegisterRequest, LoginRequest, AuthResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if not body.name.strip():
        raise HTTPException(400, detail={"fields": {"name": "Name is required"}})
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, detail={"error": "Email already in use"})
    if len(body.password) < 6:
        raise HTTPException(400, detail={"fields": {"password": "Password must be at least 6 characters"}})

    user = User(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=create_token(str(user.id)), user=UserResponse.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, detail={"error": "invalid email or password"})

    return AuthResponse(token=create_token(str(user.id)), user=UserResponse.model_validate(user))
