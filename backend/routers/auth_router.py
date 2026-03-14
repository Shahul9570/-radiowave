from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from database import get_db
import models
import auth as auth_utils

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(models.User).filter(models.User.phone == body.phone).first():
        raise HTTPException(400, "Phone number already registered")
    user = models.User(
        name=body.name.strip(),
        email=body.email,
        phone=body.phone,
        password_hash=auth_utils.hash_password(body.password),
    )
    db.add(user); db.commit(); db.refresh(user)
    token = auth_utils.create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not auth_utils.verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    token = auth_utils.create_access_token(user.id)
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def get_me(current_user: models.User = Depends(auth_utils.get_current_user)):
    return current_user