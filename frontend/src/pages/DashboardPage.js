import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWS } from '../context/WSContext';
import { api } from '../services/api';

export default function DashboardPage() {
  const { user }    = useAuth();
  const { connected, onlineUsers, incomingTransmission } = useWS();
  const navigate    = useNavigate();
  const [friends,  setFriends]  = useState([]);
  const [pending,  setPending]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([api.getFriends(), api.getPending()])
      .then(([f, p]) => { setFriends(f); setPending(p); })
      .finally(() => setLoading(false));
  }, []);

  const acceptReq = async (req) => {
    await api.acceptFriendRequest(req.request_id);
    setPending(p => p.filter(r => r.request_id !== req.request_id));
    api.getFriends().then(setFriends);
  };
  const rejectReq = async (req) => {
    await api.rejectFriendRequest(req.request_id);
    setPending(p => p.filter(r => r.request_id !== req.request_id));
  };

  const onlineFriends = friends.filter(f => onlineUsers.has(f.id));

  const StatBox = ({ value, label, accent }) => (
    <div className="panel" style={{ padding:'20px 24px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', fontWeight:700, color: accent || 'var(--amber)', marginBottom:4 }}>{value}</div>
      <div className="label-tag">{label}</div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--amber)' }}>COMMAND CENTER</h1>
        <p style={{ color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:'0.8rem', marginTop:4 }}>OPERATOR: {user?.name?.toUpperCase()}</p>
      </div>

      {incomingTransmission && (
        <div style={{ background:'rgba(76,175,80,0.12)', border:'1px solid var(--green2)', borderRadius:'var(--radius2)', padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', gap:3 }}>
            {[...Array(5)].map((_,i) => <div key={i} className="waveform-bar" style={{ animationDelay:`${i*0.1}s` }}/>)}
          </div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, color:'var(--green)', fontSize:'1rem' }}>◉ INCOMING TRANSMISSION</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text2)' }}>
              {friends.find(f => f.id === incomingTransmission)?.name || `USER #${incomingTransmission}`} IS BROADCASTING
            </div>
          </div>
          <button className="btn btn-green btn-sm" style={{ marginLeft:'auto' }} onClick={() => navigate('/radio')}>OPEN RADIO</button>
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', justifyContent:'center', padding:40 }}><div className="spinner"/></div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14, marginBottom:28 }}>
            <StatBox value={friends.length}        label="TOTAL FRIENDS" />
            <StatBox value={onlineFriends.length}  label="ONLINE NOW"    accent="var(--green)" />
            <StatBox value={pending.length}        label="PENDING"       accent={pending.length > 0 ? 'var(--amber)' : undefined} />
            <StatBox value={connected ? '●' : '○'} label="CONNECTION"   accent={connected ? 'var(--green)' : 'var(--red)'} />
          </div>

          {pending.length > 0 && (
            <div style={{ marginBottom:28 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--amber)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <div className="led amber"/> PENDING REQUESTS
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pending.map(req => (
                  <div key={req.request_id} className="panel" style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
                    <div className="avatar" style={{ width:36, height:36, fontSize:'0.85rem' }}>{req.from_name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>{req.from_name}</div>
                      <div className="label-tag" style={{ fontSize:'0.65rem' }}>{req.from_email}</div>
                    </div>
                    <button className="btn btn-green btn-xs" onClick={() => acceptReq(req)}>ACCEPT</button>
                    <button className="btn btn-danger btn-xs" onClick={() => rejectReq(req)}>REJECT</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {onlineFriends.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1rem', letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--green)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                <div className="led green"/> ONLINE NOW
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {onlineFriends.map(f => (
                  <div key={f.id} className="friend-card" onClick={() => navigate('/radio', { state:{ friend:f } })}>
                    <div className="status-dot online"/>
                    <div className="avatar" style={{ width:36, height:36, fontSize:'0.85rem' }}>{f.name[0]}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>{f.name}</div>
                      <div className="label-tag" style={{ fontSize:'0.65rem' }}>{f.email}</div>
                    </div>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--green)' }}>RADIO →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friends.length === 0 && (
            <div className="panel" style={{ padding:32, textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>◈</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:600, marginBottom:8 }}>No friends yet</div>
              <div style={{ color:'var(--text2)', marginBottom:16, fontSize:'0.9rem' }}>Search for operators to add to your network</div>
              <button className="btn btn-amber" onClick={() => navigate('/search')}>FIND OPERATORS</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}