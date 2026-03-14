from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from database import get_db
import models
import auth as auth_utils
from websocket_manager import manager

router = APIRouter(prefix="/friends", tags=["Friends"])


class ActionBody(BaseModel):
    target_id: int


class FriendOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    online: bool = False
    friendship_id: int


class PendingOut(BaseModel):
    request_id: int
    from_id: int
    from_name: str
    from_email: str
    from_phone: str


def get_rel(db, a, b):
    return db.query(models.Friend).filter(
        ((models.Friend.user_id == a) & (models.Friend.friend_id == b)) |
        ((models.Friend.user_id == b) & (models.Friend.friend_id == a))
    ).first()


def friend_ids(db, uid):
    rows = db.query(models.Friend).filter(
        (models.Friend.user_id == uid) | (models.Friend.friend_id == uid),
        models.Friend.status == models.FriendStatus.accepted
    ).all()
    return [r.friend_id if r.user_id == uid else r.user_id for r in rows]


@router.post("/request", status_code=201)
async def send_request(body: ActionBody, cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    if body.target_id == cu.id:
        raise HTTPException(400, "Cannot add yourself")
    target = db.query(models.User).filter(models.User.id == body.target_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    existing = get_rel(db, cu.id, body.target_id)
    if existing:
        if existing.status == models.FriendStatus.accepted:
            raise HTTPException(400, "Already friends")
        if existing.status == models.FriendStatus.pending:
            raise HTTPException(400, "Request already pending")
        existing.status = models.FriendStatus.pending
        existing.user_id = cu.id
        existing.friend_id = body.target_id
        db.commit()
        await manager.send_json(body.target_id, {"type": "friend_request", "from_id": cu.id, "from_name": cu.name, "request_id": existing.id})
        return {"message": "Friend request sent"}
    req = models.Friend(user_id=cu.id, friend_id=body.target_id, status=models.FriendStatus.pending)
    db.add(req); db.commit(); db.refresh(req)
    await manager.send_json(body.target_id, {"type": "friend_request", "from_id": cu.id, "from_name": cu.name, "request_id": req.id})
    return {"message": "Friend request sent"}


@router.post("/accept")
async def accept(body: ActionBody, cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    req = db.query(models.Friend).filter(
        models.Friend.id == body.target_id,
        models.Friend.friend_id == cu.id,
        models.Friend.status == models.FriendStatus.pending
    ).first()
    if not req:
        raise HTTPException(404, "Request not found")
    req.status = models.FriendStatus.accepted
    db.commit()
    await manager.send_json(req.user_id, {"type": "friend_accepted", "by_id": cu.id, "by_name": cu.name})
    return {"message": "Accepted"}


@router.post("/reject")
async def reject(body: ActionBody, cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    req = db.query(models.Friend).filter(
        models.Friend.id == body.target_id,
        models.Friend.friend_id == cu.id,
        models.Friend.status == models.FriendStatus.pending
    ).first()
    if not req:
        raise HTTPException(404, "Request not found")
    req.status = models.FriendStatus.rejected
    db.commit()
    return {"message": "Rejected"}


@router.get("/", response_model=List[FriendOut])
def get_friends(cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Friend).filter(
        (models.Friend.user_id == cu.id) | (models.Friend.friend_id == cu.id),
        models.Friend.status == models.FriendStatus.accepted
    ).all()
    result = []
    for row in rows:
        oid = row.friend_id if row.user_id == cu.id else row.user_id
        u = db.query(models.User).filter(models.User.id == oid).first()
        if u:
            result.append(FriendOut(id=u.id, name=u.name, email=u.email, phone=u.phone, online=manager.is_online(u.id), friendship_id=row.id))
    return result


@router.get("/pending", response_model=List[PendingOut])
def get_pending(cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.Friend).filter(
        models.Friend.friend_id == cu.id,
        models.Friend.status == models.FriendStatus.pending
    ).all()
    result = []
    for row in rows:
        u = db.query(models.User).filter(models.User.id == row.user_id).first()
        if u:
            result.append(PendingOut(request_id=row.id, from_id=u.id, from_name=u.name, from_email=u.email, from_phone=u.phone))
    return result


@router.delete("/{friend_id}")
async def remove(friend_id: int, cu=Depends(auth_utils.get_current_user), db: Session = Depends(get_db)):
    rel = get_rel(db, cu.id, friend_id)
    if not rel or rel.status != models.FriendStatus.accepted:
        raise HTTPException(404, "Friend not found")
    db.delete(rel); db.commit()
    return {"message": "Removed"}