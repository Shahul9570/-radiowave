import React from 'react';
import { useWS } from '../context/WSContext';

export default function ToastContainer() {
  const { notifications, dismissNotif } = useWS();
  if (!notifications.length) return null;
  return (
    <div className="toast-container">
      {notifications.map(n => (
        <div key={n.id} className={`toast ${n.kind || 'info'}`}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.9rem', marginBottom:2 }}>
              {n.kind === 'friend_request' ? '◈ Friend Request' :
               n.kind === 'success'        ? '✓ Success'        :
               n.kind === 'error'          ? '✕ Error'          : '◉ Notice'}
            </div>
            <div style={{ fontSize:'0.82rem', color:'var(--text2)', fontFamily:'var(--font-mono)' }}>{n.message}</div>
          </div>
          <button onClick={() => dismissNotif(n.id)} style={{ color:'var(--text3)', fontSize:'0.8rem', padding:4 }}>✕</button>
        </div>
      ))}
    </div>
  );
}