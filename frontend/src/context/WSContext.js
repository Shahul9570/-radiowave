import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../services/api';
import { useAuth } from './AuthContext';

const WSContext = createContext(null);

export function WSProvider({ children }) {
  const { user } = useAuth();
  const wsRef           = useRef(null);
  const reconnectRef    = useRef(null);
  const listenersRef    = useRef({});
  const audioCtxRef     = useRef(null);
  const nextPlayTimeRef = useRef(0);

  const [connected,            setConnected]            = useState(false);
  const [onlineUsers,          setOnlineUsers]          = useState(new Set());
  const [notifications,        setNotifications]        = useState([]);
  const [incomingTransmission, setIncomingTransmission] = useState(null);

  const addNotif = useCallback((n) => {
    const id = Date.now() + Math.random();
    setNotifications(p => [...p, { ...n, id }]);
    setTimeout(() => setNotifications(p => p.filter(x => x.id !== id)), 6000);
  }, []);

  const dismissNotif = useCallback((id) => {
    setNotifications(p => p.filter(x => x.id !== id));
  }, []);

  const playAudio = useCallback(async (arrayBuffer) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        nextPlayTimeRef.current = 0;
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const pcm    = new Int16Array(arrayBuffer.slice(4));
      if (pcm.length === 0) return;
      const float32 = new Float32Array(pcm.length);
      for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;

      const buf = ctx.createBuffer(1, float32.length, 16000);
      buf.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      const now     = ctx.currentTime;
      const startAt = Math.max(now, nextPlayTimeRef.current);
      src.start(startAt);
      nextPlayTimeRef.current = startAt + buf.duration;
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('rw_token');
    if (!token || !user) return;

    const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
    wsRef.current    = ws;
    ws.binaryType    = 'arraybuffer';

    ws.onopen = () => {
      setConnected(true);
      clearTimeout(reconnectRef.current);
    };

    ws.onmessage = async (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        playAudio(ev.data);
        return;
      }
      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case 'online_friends':
            setOnlineUsers(new Set(msg.online_ids)); break;
          case 'status_update':
            setOnlineUsers(prev => {
              const s = new Set(prev);
              if (msg.online) s.add(msg.user_id); else s.delete(msg.user_id);
              return s;
            }); break;
          case 'friend_request':
            addNotif({ kind: 'friend_request', message: `${msg.from_name} sent you a friend request`, ...msg });
            Object.values(listenersRef.current).forEach(fn => fn(msg)); break;
          case 'friend_accepted':
            addNotif({ kind: 'success', message: `${msg.by_name} accepted your friend request!` });
            Object.values(listenersRef.current).forEach(fn => fn(msg)); break;
          case 'transmission_start':
            setIncomingTransmission(msg.sender_id); break;
          case 'transmission_end':
            setIncomingTransmission(null);
            nextPlayTimeRef.current = 0; break;
          case 'error':
            addNotif({ kind: 'error', message: msg.message }); break;
          default: break;
        }
      } catch(e) {}
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setConnected(false);
      setIncomingTransmission(null);
      reconnectRef.current = setTimeout(() => { if (user) connect(); }, 4000);
    };

    ws.onerror = () => ws.close();
  }, [user, addNotif, playAudio]);

  useEffect(() => {
    if (user) connect();
    return () => {
      clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]); // eslint-disable-line

  const sendJSON  = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(data));
  }, []);

  const sendBytes = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(data);
  }, []);

  const on = useCallback((key, fn) => {
    listenersRef.current[key] = fn;
    return () => delete listenersRef.current[key];
  }, []);

  return (
    <WSContext.Provider value={{
      connected, onlineUsers, notifications, incomingTransmission,
      sendJSON, sendBytes, on, dismissNotif, addNotif,
    }}>
      {children}
    </WSContext.Provider>
  );
}

export const useWS = () => useContext(WSContext);