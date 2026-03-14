import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWS } from '../context/WSContext';
import { api } from '../services/api';

export default function FriendsPage() {
  const { onlineUsers, on } = useWS();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('friends');

  const refresh = async () => {
    setLoading(true);
    try {
      const [f, p] = await Promise.all([api.getFriends(), api.getPending()]);
      setFriends(f); setPending(p);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    const off = on('friends_refresh', refresh);
    return off;
  }, []); // eslint-disable-line

  const acceptReq = async (req) => { await api.acceptFriendRequest(req.request_id); await refresh(); };
  const rejectReq = async (req) => { await api.rejectFriendRequest(req.request_id); setPending(p => p.filter(r => r.request_id !== req.request_id)); };
  const removeF   = async (id)  => { if (!window.confirm('Remove this friend?')) return; await api.removeFriend(id); setFriends(f => f.filter(x => x.id !== id)); };

  const onlineFriends  = friends.filter(f => onlineUsers.has(f.id));
  const offlineFriends = friends.filter(f => !onlineUsers.has(f.id));

  const TabBtn = ({ name, label, count }) => (
    <button onClick={() => setTab(name)} style={{
      padding:'8px 20px', fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.9rem',
      letterSpacing:'0.06em', textTransform:'uppercase',
      color: tab===name ? 'var(--amber)' : 'var(--text2)',
      borderBottom: tab===name ? '2px solid var(--amber)' : '2px solid transparent',
      transition:'all 0.15s',
    }}>
      {label}{count > 0 && <span style={{ background:'var(--amber)', color:'var(--chassis)', borderRadius:10, padding:'1px 7px', fontSize:'0.7rem', marginLeft:6 }}>{count}</span>}
    </button>
  );

  const FriendRow = ({ f, online }) => (
    <div style={{ display:'flex', alignItems:'center', gap:12, background:'var(--panel)', border:'1px solid var(--edge)', borderRadius:'var(--radius2)', padding:'14px 16px', opacity: online ? 1 : 0.7 }}>
      <div className={`status-dot ${online ? 'online' : 'offline'}`}/>
      <div className="avatar" style={{ width:36, height:36, fontSize:'0.85rem', opacity: online ? 1 : 0.6 }}>{f.name[0]}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>{f.name}</div>
        <div className="label-tag" style={{ fontSize:'0.63rem' }}>{f.email}</div>
      </div>
      {online && <button className="btn btn-green btn-xs" onClick={() => navigate('/radio', { state:{ friend:f } })}>◉ RADIO</button>}
      <button className="btn btn-ghost btn-xs" onClick={() => removeF(f.id)}>✕</button>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--amber)' }}>NETWORK</h1>
        <p style={{ color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:'0.8rem', marginTop:4 }}>YOUR OPERATOR CONNECTIONS</p>
      </div>
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--edge)', marginBottom:24 }}>
        <TabBtn name="friends" label="Friends" count={0}/>
        <TabBtn name="pending" label="Requests" count={pending.length}/>
      </div>
      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner"/></div>
      ) : tab === 'friends' ? (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {onlineFriends.map(f  => <FriendRow key={f.id} f={f} online={true}/>)}
          {offlineFriends.map(f => <FriendRow key={f.id} f={f} online={false}/>)}
          {friends.length === 0 && (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>◈</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem', marginBottom:16 }}>NO CONNECTIONS IN YOUR NETWORK</div>
              <button className="btn btn-amber" onClick={() => navigate('/search')}>FIND OPERATORS</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {pending.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.85rem' }}>NO PENDING REQUESTS</div>
          ) : pending.map(req => (
            <div key={req.request_id} className="panel" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
              <div className="avatar">{req.from_name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>{req.from_name}</div>
                <div className="label-tag" style={{ fontSize:'0.65rem' }}>{req.from_email}</div>
              </div>
              <button className="btn btn-green btn-xs" onClick={() => acceptReq(req)}>ACCEPT</button>
              <button className="btn btn-danger btn-xs" onClick={() => rejectReq(req)}>REJECT</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}