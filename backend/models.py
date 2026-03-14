import enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class FriendStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(255), unique=True, index=True, nullable=False)
    phone         = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    sent_requests     = relationship("Friend", foreign_keys="Friend.user_id",     back_populates="sender")
    received_requests = relationship("Friend", foreign_keys="Friend.friend_id",   back_populates="receiver")
    sent_sessions     = relationship("VoiceSession", foreign_keys="VoiceSession.sender_id",   back_populates="sender")
    received_sessions = relationship("VoiceSession", foreign_keys="VoiceSession.receiver_id", back_populates="receiver")


class Friend(Base):
    __tablename__ = "friends"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    friend_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    status     = Column(Enum(FriendStatus), default=FriendStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    sender   = relationship("User", foreign_keys=[user_id],   back_populates="sent_requests")
    receiver = relationship("User", foreign_keys=[friend_id], back_populates="received_requests")


class VoiceSession(Base):
    __tablename__ = "voice_sessions"
    id          = Column(Integer, primary_key=True, index=True)
    sender_id   = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    timestamp   = Column(DateTime(timezone=True), server_default=func.now())
    duration_ms = Column(Integer, default=0)

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="sent_sessions")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_sessions")