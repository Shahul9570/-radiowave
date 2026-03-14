import os
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Request
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, SessionLocal
import models
from auth import get_ws_user
from websocket_manager import manager
from routers.auth_router import router as auth_router
from routers.users_router import router as users_router
from routers.friends_router import router as friends_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="RadioWave API", version="1.0.0")


# ── CORS Middleware ─────────────────────────────────────────────────
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    origin = request.headers.get("origin")
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://radiowave.pages.dev",
        "https://taptalk.pages.dev",
        "https://radiowave-trm3.onrender.com",
    ]

    # Use the request origin if it's in our allowed list, else use first allowed
    cors_origin = origin if origin in allowed_origins else "http://localhost:3000"

    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin":      cors_origin,
            "Access-Control-Allow-Methods":     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers":     "Authorization, Content-Type, Accept, X-Requested-With",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age":           "86400",
            "Vary":                             "Origin",
        }
        return Response(content="OK", status_code=200, headers=headers)

    # Process normal request
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"]      = cors_origin
    response.headers["Access-Control-Allow-Methods"]     = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"]     = "Authorization, Content-Type, Accept, X-Requested-With"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Vary"]                             = "Origin"
    return response


# ── Routers ─────────────────────────────────────────────────────────
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(friends_router)


# ── Helpers ─────────────────────────────────────────────────────────
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


# ── WebSocket ────────────────────────────────────────────────────────
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
                if msg.get("type") == "websocket.disconnect":
                    break
                if "text" in msg and msg.get("text"):
                    try:
                        data = json.loads(msg["text"])
                    except Exception:
                        continue
                    t = data.get("type")
                    if t == "start_transmission":
                        tid = data.get("target_id")
                        if isinstance(tid, int) and _are_friends(db, user.id, tid):
                            await manager.start_transmission(user.id, tid)
                        else:
                            await manager.send_json(user.id, {
                                "type": "error",
                                "message": "Not friends with that user"
                            })
                    elif t == "stop_transmission":
                        await manager.stop_transmission(user.id)
                    elif t == "ping":
                        await manager.send_json(user.id, {"type": "pong"})
                elif "bytes" in msg and msg.get("bytes"):
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


# ── Health Check ─────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "online_users": manager.online_count()}


# ── Serve React Frontend ─────────────────────────────────────────────
frontend_build = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
if os.path.exists(frontend_build):
    app.mount(
        "/static",
        StaticFiles(directory=os.path.join(frontend_build, "static")),
        name="static",
    )

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(frontend_build, "index.html"))

    @app.get("/{full_path:path}")
    def serve_react(full_path: str):
        return FileResponse(os.path.join(frontend_build, "index.html"))