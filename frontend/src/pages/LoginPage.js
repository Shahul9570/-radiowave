import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch(err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="page" style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(var(--edge) 1px,transparent 1px),linear-gradient(90deg,var(--edge) 1px,transparent 1px)', backgroundSize:'40px 40px', opacity:0.15, pointerEvents:'none' }}/>
      <div style={{ width:'100%', maxWidth:420, position:'relative' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'radial-gradient(circle,var(--amber),var(--amber2))', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:'1.6rem', color:'var(--chassis)', boxShadow:'var(--amber-shadow)' }}>◉</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:700, letterSpacing:'0.1em', color:'var(--amber)', marginBottom:4 }}>RADIOWAVE</h1>
          <p className="label-tag">SECURE CHANNEL ACCESS</p>
        </div>
        <div className="panel" style={{ padding:32 }}>
          <form onSubmit={handle} style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="field">
              <label>Email Address</label>
              <input type="email" placeholder="operator@base.net" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button type="submit" className="btn btn-amber btn-full" disabled={loading}>
              {loading ? <><span className="spinner"/>&nbsp;AUTHENTICATING...</> : '⚡ CONNECT'}
            </button>
          </form>
          <div style={{ textAlign:'center', marginTop:20, fontFamily:'var(--font-mono)', fontSize:'0.78rem', color:'var(--text3)' }}>
            NO ACCOUNT? <Link to="/signup" style={{ color:'var(--amber)', textDecoration:'underline' }}>REGISTER UNIT</Link>
          </div>
        </div>
      </div>
    </div>
  );
}