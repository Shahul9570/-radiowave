import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useWS } from '../context/WSContext';
import { api } from '../services/api';
import { usePTT } from '../hooks/usePTT';

function Waveform({ bars = 7 }) {
  return (
    <div className="waveform" style={{ justifyContent:'center' }}>
      {[...Array(bars)].map((_,i) => (
        <div key={i} className="waveform-bar" style={{ animationDelay:`${i*0.07}s`, animationDuration:`${0.35+(i%3)*0.1}s` }}/>
      ))}
    </div>
  );
}

export default function RadioPage() {
  const location = useLocation();
  const { onlineUsers, incomingTransmission, connected } = useWS();
  const [friends,  setFriends]  = useState([]);
  const [selected, setSelected] = useState(location.state?.friend || null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getFriends().then(f => {
      setFriends(f);
      if (!selected && f.length > 0) setSelected(f[0]);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const { transmitting, error, startTransmit, stopTransmit } = usePTT(selected?.id || null);

  const isTargetOnline = selected ? onlineUsers.has(selected.id) : false;
  const isReceiving    = incomingTransmission != null;
  const fromFriend     = friends.find(f => f.id === incomingTransmission);

  const handleDown = useCallback((e) => {
    e.preventDefault();
    if (isTargetOnline && selected && !isReceiving) startTransmit();
  }, [isTargetOnline, selected, isReceiving, startTransmit]);

  const handleUp = useCallback((e) => {
    e.preventDefault();
    stopTransmit();
  }, [stopTransmit]);

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 56px)' }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--amber)' }}>RADIO</h1>
        <p style={{ color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:'0.8rem', marginTop:4 }}>PUSH-TO-TALK TRANSCEIVER</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:20, flex:1, minHeight:0 }}>

        {/* Contact list */}
        <div className="panel" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--edge)', display:'flex', alignItems:'center', gap:8 }}>
            <div className="led amber"/>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.9rem', letterSpacing:'0.08em', textTransform:'uppercase' }}>CONTACTS</span>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:30 }}><div className="spinner"/></div>
            ) : friends.length === 0 ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--text3)', fontFamily:'var(--font-mono)', fontSize:'0.8rem' }}>NO CONTACTS</div>
            ) : friends.map(f => {
              const online = onlineUsers.has(f.id);
              const isSel  = selected?.id === f.id;
              return (
                <button key={f.id} onClick={() => setSelected(f)} style={{
                  width:'100%', textAlign:'left', padding:'12px 16px',
                  display:'flex', alignItems:'center', gap:10,
                  background: isSel ? 'rgba(232,160,32,0.08)' : 'transparent',
                  borderLeft: isSel ? '3px solid var(--amber)' : '3px solid transparent',
                  borderBottom:'1px solid var(--edge)', transition:'all 0.15s',
                }}>
                  <div className={`status-dot ${online ? 'online' : 'offline'}`}/>
                  <div className="avatar" style={{ width:32, height:32, fontSize:'0.8rem', opacity: online ? 1 : 0.5 }}>{f.name[0]}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: online ? 'var(--text)' : 'var(--text3)' }}>{f.name}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.65rem', color: online ? 'var(--green)' : 'var(--text3)' }}>{online ? 'ONLINE' : 'OFFLINE'}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PTT Interface */}
        <div className="panel" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center,rgba(232,160,32,0.03) 0%,transparent 70%)', pointerEvents:'none' }}/>

          {selected ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:24, position:'relative', zIndex:1, width:'100%', maxWidth:400, padding:20 }}>

              {/* Contact info */}
              <div style={{ textAlign:'center' }}>
                <div className="avatar" style={{ width:64, height:64, fontSize:'1.5rem', margin:'0 auto 12px', borderWidth:2, borderColor: isTargetOnline ? 'var(--green2)' : 'var(--edge2)', boxShadow: isTargetOnline ? 'var(--green-shadow)' : 'none' }}>
                  {selected.name[0]}
                </div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:700, letterSpacing:'0.08em' }}>{selected.name}</div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:6 }}>
                  <div className={`status-dot ${isTargetOnline ? 'online' : 'offline'}`}/>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color: isTargetOnline ? 'var(--green)' : 'var(--text3)' }}>
                    {isTargetOnline ? 'ONLINE — READY TO RECEIVE' : 'OFFLINE — UNAVAILABLE'}
                  </span>
                </div>
              </div>

              {/* Incoming indicator */}
              {isReceiving && (
                <div style={{ background:'rgba(76,175,80,0.1)', border:'1px solid var(--green2)', borderRadius:'var(--radius2)', padding:'10px 20px', display:'flex', alignItems:'center', gap:12, width:'100%', justifyContent:'center' }}>
                  <Waveform bars={9}/>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--green)', fontSize:'0.95rem' }}>
                    {fromFriend?.name || 'INCOMING'} TRANSMITTING
                  </span>
                </div>
              )}

              {/* Transmitting indicator */}
              {transmitting && (
                <div style={{ background:'rgba(239,83,80,0.1)', border:'1px solid var(--red2)', borderRadius:'var(--radius2)', padding:'10px 20px', display:'flex', alignItems:'center', gap:12, width:'100%', justifyContent:'center' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'var(--red)', animation:'pulse-dot 0.6s infinite' }}/>
                  <span style={{ fontFamily:'var(--font-display)', fontWeight:600, color:'var(--red)', fontSize:'0.95rem' }}>TRANSMITTING</span>
                  <Waveform bars={7}/>
                </div>
              )}

              {/* PTT Button */}
              <div style={{ position:'relative' }}>
                <div
                  className={`ptt-btn ${transmitting ? 'active' : ''}`}
                  onPointerDown={handleDown}
                  onPointerUp={handleUp}
                  onPointerLeave={handleUp}
                  style={{ opacity: isTargetOnline && !isReceiving ? 1 : 0.4, cursor: isTargetOnline && !isReceiving ? 'pointer' : 'not-allowed' }}
                >
                  <div className="ptt-ring"/>
                  <div style={{ fontSize:'2.2rem', pointerEvents:'none' }}>{transmitting ? '📡' : '🎙'}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.85rem', letterSpacing:'0.12em', textTransform:'uppercase', color: transmitting ? 'var(--green)' : 'var(--text2)', pointerEvents:'none' }}>
                    {transmitting ? 'RELEASE' : 'HOLD TO TALK'}
                  </div>
                </div>
              </div>

              {error && <div className="error-msg" style={{ textAlign:'center', width:'100%' }}>{error}</div>}

              {!isTargetOnline && (
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text3)', textAlign:'center' }}>
                  Contact must be online to transmit
                </div>
              )}

              <div className="panel" style={{ padding:'12px 20px', background:'var(--chassis2)', width:'100%' }}>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text3)', textAlign:'center', lineHeight:1.7 }}>
                  HOLD PTT TO TRANSMIT • RELEASE TO STOP<br/>
                  ONLY ONE PARTY MAY TRANSMIT AT A TIME
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', color:'var(--text3)' }}>
              <div style={{ fontSize:'4rem', marginBottom:16 }}>◉</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.9rem' }}>SELECT A CONTACT TO BEGIN</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}