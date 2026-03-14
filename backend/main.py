import os, json, logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from auth import get_ws_user
from websocket_manager import manager
from routers.auth_router import router as auth_router
from routers.users_router import router as users_router
from routers.friends_router import router as friends_router

logging.basicConfig(level=logging.INFO)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RadioWave API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://radiowave.pages.dev",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(friends_router)


def _friend_ids(db, uid):
    rows = db.query(models.Friend).filter(
        (models.Friend.user_id == uid) | (models.Friend.friend_id == uid),
        models.Friend.status == models.FriendStatus.accepted
    ).all()
    return [r.friend_id if r.user_id == uid else r.user_id for r in rows]


def _are_friends(db, a, b):
    return db.query(models.Friend).filter(
        ((models.Friend.user_id == a) & (models.Friend.friend_id == b)) |
        ((models.Friend.user_id == b) & (models.Friend.friend_id == a)),
        models.Friend.status == models.FriendStatus.accepted
    ).first() is not None


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    user = None
    try:
        user = await get_ws_user(token, db)
        if not user:
            await ws.close(code=4001)
            return
        await manager.connect(ws, user.id)
        fids = _friend_ids(db, user.id)
        online = [f for f in fids if manager.is_online(f)]
        await manager.send_json(user.id, {"type": "online_friends", "online_ids": online})
        await manager.broadcast_status(user.id, True, fids)
        try:
            while True:
                msg = await ws.receive()
                if "text" in msg and msg["text"]:
                    try:
                        data = json.loads(msg["text"])
                    except:
                        continue
                    t = data.get("type")
                    if t == "start_transmission":
                        tid = data.get("target_id")
                        if isinstance(tid, int) and _are_friends(db, user.id, tid):
                            await manager.start_transmission(user.id, tid)
                        else:
                            await manager.send_json(user.id, {"type": "error", "message": "Not friends with that user"})
                    elif t == "stop_transmission":
                        await manager.stop_transmission(user.id)
                    elif t == "ping":
                        await manager.send_json(user.id, {"type": "pong"})
                elif "bytes" in msg and msg["bytes"]:
                    await manager.forward_audio(user.id, msg["bytes"])
        except WebSocketDisconnect:
            pass
    finally:
        if user:
            await manager.stop_transmission(user.id)
            await manager.disconnect(user.id)
            fids = _friend_ids(db, user.id)
            await manager.broadcast_status(user.id, False, fids)
        db.close()


@app.get("/health")
def health():
    return {"status": "ok", "online_users": manager.online_count()}


# Serve React frontend (after npm run build)
frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
if os.path.exists(frontend_build):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_build, "static")), name="static")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(frontend_build, "index.html"))

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        return FileResponse(os.path.join(frontend_build, "index.html"))