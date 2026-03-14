import React, { useState, useCallback } from 'react';
import { api } from '../services/api';

export default function SearchPage() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState({});
  const [error,   setError]   = useState('');

  const search = useCallback(async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(''); setResults([]);
    try {
      const data = await api.searchUsers(query.trim());
      setResults(data);
      if (data.length === 0) setError('No operators found.');
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  }, [query]);

  const sendRequest = async (userId) => {
    setStatus(s => ({ ...s, [userId]: 'loading' }));
    try {
      await api.sendFriendRequest(userId);
      setStatus(s => ({ ...s, [userId]: 'sent' }));
    } catch(err) {
      setStatus(s => ({ ...s, [userId]: 'error:' + err.message }));
    }
  };

  return (
    <div className="page">
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--amber)' }}>FIND OPERATORS</h1>
        <p style={{ color:'var(--text2)', fontFamily:'var(--font-mono)', fontSize:'0.8rem', marginTop:4 }}>SEARCH BY EMAIL OR PHONE NUMBER</p>
      </div>
      <div className="panel" style={{ padding:24, marginBottom:24 }}>
        <form onSubmit={search} style={{ display:'flex', gap:12 }}>
          <div className="field" style={{ flex:1 }}>
            <label>Search Query</label>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="email@example.com or phone number"/>
          </div>
          <div style={{ display:'flex', alignItems:'flex-end' }}>
            <button type="submit" className="btn btn-amber" disabled={loading || !query.trim()}>
              {loading ? <span className="spinner"/> : '◎ SCAN'}
            </button>
          </div>
        </form>
      </div>
      {error && <div className="error-msg" style={{ marginBottom:16 }}>{error}</div>}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {results.map(u => {
          const s = status[u.id];
          return (
            <div key={u.id} className="panel" style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <div className="avatar">{u.name[0]}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'1rem' }}>{u.name}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text2)' }}>{u.email}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.72rem', color:'var(--text3)' }}>{u.phone}</div>
              </div>
              {s === 'sent'           ? <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--green)' }}>✓ SENT</span>
              : s === 'loading'       ? <span className="spinner"/>
              : s?.startsWith('error:') ? <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--red)' }}>{s.slice(6)}</span>
              : <button className="btn btn-outline btn-sm" onClick={() => sendRequest(u.id)}>+ ADD</button>}
            </div>
          );
        })}
      </div>
      {!loading && !results.length && !error && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text3)' }}>
          <div style={{ fontSize:'3rem', marginBottom:12 }}>◎</div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize:'0.85rem' }}>ENTER EMAIL OR PHONE TO SCAN NETWORK</div>
        </div>
      )}
    </div>
  );
}