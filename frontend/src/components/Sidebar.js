import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWS } from '../context/WSContext';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { path: '/friends',   label: 'Friends',   icon: '◈' },
  { path: '/search',    label: 'Find Users', icon: '◎' },
  { path: '/radio',     label: 'Radio',     icon: '◉' },
];

export default function Sidebar() {
  const { user, logout }           = useAuth();
  const { connected, onlineUsers } = useWS();
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <aside className="sidebar">
      <div style={{ padding:'24px 20px 18px', borderBottom:'1px solid var(--edge)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background:'radial-gradient(circle,var(--amber),var(--amber2))', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--chassis)', fontWeight:700, boxShadow:'var(--amber-shadow)', fontSize:'1rem' }}>◉</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.15rem', letterSpacing:'0.1em', color:'var(--amber)' }}>RADIOWAVE</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className={`led ${connected ? 'green' : 'red'}`}/>
          <span className="label-tag">{connected ? 'ONLINE' : 'OFFLINE'} • {onlineUsers.size} ACTIVE</span>
        </div>
      </div>

      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--edge)', display:'flex', alignItems:'center', gap:10 }}>
        <div className="avatar" style={{ width:36, height:36, fontSize:'0.85rem' }}>{user?.name?.[0] || '?'}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
          <div className="label-tag" style={{ fontSize:'0.6rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email}</div>
        </div>
      </div>

      <nav style={{ flex:1, padding:'10px 0' }}>
        {NAV.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              width:'100%', textAlign:'left', padding:'11px 20px',
              display:'flex', alignItems:'center', gap:12,
              fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.95rem',
              letterSpacing:'0.05em', textTransform:'uppercase',
              color: active ? 'var(--amber)' : 'var(--text2)',
              background: active ? 'rgba(232,160,32,0.08)' : 'transparent',
              borderLeft: active ? '3px solid var(--amber)' : '3px solid transparent',
              transition:'all 0.15s',
            }}>
              <span style={{ fontSize:'1.1rem', opacity: active ? 1 : 0.6 }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:'16px 20px', borderTop:'1px solid var(--edge)' }}>
        <button className="btn btn-ghost btn-full btn-sm" onClick={logout}
          style={{ fontFamily:'var(--font-mono)', fontSize:'0.73rem', letterSpacing:'0.1em' }}>
          ⏻ DISCONNECT
        </button>
      </div>
    </aside>
  );
}