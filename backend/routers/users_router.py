from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/users", tags=["Users"])


class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    model_config = {"from_attributes": True}


@router.get("/search", response_model=List[UserPublic])
def search_users(
    q: str = Query(..., min_length=1),
    current_user: models.User = Depends(auth_utils.get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.User).filter(
        models.User.id != current_user.id,
        (models.User.email.ilike(f"%{q}%") | models.User.phone.ilike(f"%{q}%"))
    ).limit(20).all()