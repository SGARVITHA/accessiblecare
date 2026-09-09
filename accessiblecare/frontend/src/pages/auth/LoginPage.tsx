import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const result = await signIn(email, password);
    setSubmitting(false);

    if (result.success && result.role) {
      // Navigate to previous location or default role destination
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      if (from && from !== '/login') {
        navigate(from, { replace: true });
      } else {
        const userRole = result.role.toUpperCase();
        if (userRole === 'PATIENT') {
          navigate('/patient', { replace: true });
        } else if (userRole === 'STAFF') {
          navigate('/staff', { replace: true });
        } else if (userRole === 'INTERPRETER') {
          navigate('/interpreter', { replace: true });
        } else {
          navigate('/patient', { replace: true });
        }
      }
    } else {
      setErrorMsg(result.error || 'Login failed');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2rem',
          borderRadius: '0.75rem',
          backgroundColor: '#1e293b',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          border: '1px solid #334155',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', textAlign: 'center' }}>
          AccessibleCare
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', textAlign: 'center' }}>
          Sign in to access your healthcare portal
        </p>

        {errorMsg && (
          <div
            style={{
              padding: '0.75rem',
              marginBottom: '1rem',
              backgroundColor: '#450a0a',
              border: '1px solid #991b1b',
              color: '#fca5a5',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #475569',
                backgroundColor: '#0f172a',
                color: '#f8fafc',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '0.625rem',
              borderRadius: '0.375rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
