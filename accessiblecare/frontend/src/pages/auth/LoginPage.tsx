
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_HOME: Record<string, string> = {
  PATIENT: '/patient',
  STAFF: '/staff',
  INTERPRETER: '/interpreter',
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setErrorMsg(null);
    setSubmitting(true);

    const result = await signIn(identifier.trim(), password);

    setSubmitting(false);

    if (result.success && result.role) {
      const roleHome = ROLE_HOME[result.role.trim().toUpperCase()];

      const from = (
        location.state as {
          from?: { pathname?: string };
        }
      )?.from?.pathname;

      const isRolePath =
        !!roleHome &&
        !!from &&
        (from === roleHome || from.startsWith(`${roleHome}/`));

      if (roleHome) {
        navigate(
          isRolePath ? (from as string) : roleHome,
          { replace: true },
        );
      } else {
        setErrorMsg(
          'Your account has an invalid AccessibleCare role.',
        );
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
        background: '#f8faf9',
        padding: '1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#172321',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '2rem',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid #d8e1df',
          boxShadow: '0 10px 30px rgba(15, 118, 110, 0.08)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '.75rem',
            fontWeight: 700,
            letterSpacing: '.08em',
            color: '#0f766e',
          }}
        >
          ACCESSIBLECARE
        </p>

        <h1
          style={{
            margin: '.4rem 0 .5rem',
            fontSize: '1.75rem',
          }}
        >
          Welcome back
        </h1>

        <p
          style={{
            margin: '0 0 1.5rem',
            color: '#52615e',
          }}
        >
          Sign in with your phone number or email to access your portal.
        </p>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: '.75rem',
              marginBottom: '1rem',
              borderRadius: 8,
              background: '#fff1f2',
              border: '1px solid #fecdd3',
              color: '#9f1239',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gap: '1rem',
          }}
        >
          <label
            style={{
              display: 'grid',
              gap: '.35rem',
            }}
          >
            <span>Phone number or email</span>

            <input
              type="text"
              required
              value={identifier}
              onChange={(event) =>
                setIdentifier(event.target.value)
              }
              placeholder="+91 98765 43210 or staff@hospital.com"
              autoComplete="username"
            />
          </label>

          <label
            style={{
              display: 'grid',
              gap: '.35rem',
            }}
          >
            <span>Password</span>

            <input
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Your password"
              autoComplete="current-password"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '.75rem',
              border: 0,
              borderRadius: 8,
              background: '#0f766e',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/register')}
          style={{
            width: '100%',
            marginTop: '1rem',
            padding: '.65rem',
            border: '1px solid #b9c9c6',
            borderRadius: 8,
            background: '#fff',
            color: '#0f766e',
            fontWeight: 600,
          }}
        >
          New here? Create a patient account
        </button>
      </div>
    </div>
  );
}

