from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.auth import get_current_user
from app.schemas import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("")
def list_users(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    users = db.query(User).order_by(User.name).all()
    return {"users": [{"id": str(u.id), "name": u.name, "email": u.email} for u in users]}
