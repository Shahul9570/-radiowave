import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, phone, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Background grid */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'linear-gradient(var(--edge) 1px, transparent 1px), linear-gradient(90deg, var(--edge) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.15,
          pointerEvents: 'none',
        }}
      />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'radial-gradient(circle, var(--amber), var(--amber2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '1.6rem',
              color: 'var(--chassis)',
              boxShadow: 'var(--amber-shadow)',
            }}
          >
            ◉
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: 'var(--amber)',
              marginBottom: 4,
            }}
          >
            RADIOWAVE
          </h1>
          <p className="label-tag">REGISTER NEW UNIT</p>
        </div>

        {/* Form panel */}
        <div className="panel" style={{ padding: 32 }}>
          <form
            onSubmit={handle}
            style={{ display: 'flex', flexDirection: 'column', gap: 18 }}
          >
            <div className="field">
              <label>Operator Name</label>
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="operator@base.net"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555 0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label>Password (min 6 chars)</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button
              type="submit"
              className="btn btn-amber btn-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  &nbsp;REGISTERING...
                </>
              ) : (
                '◉ REGISTER UNIT'
              )}
            </button>
          </form>

          <div
            style={{
              textAlign: 'center',
              marginTop: 20,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text3)',
            }}
          >
            HAVE CREDENTIALS?{' '}
            <Link
              to="/login"
              style={{ color: 'var(--amber)', textDecoration: 'underline' }}
            >
              CONNECT
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}