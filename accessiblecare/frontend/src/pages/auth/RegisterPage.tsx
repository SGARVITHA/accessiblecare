
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [verificationRequired, setVerificationRequired] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setErrorMsg(null);
    setMessage(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    if (!trimmedPhone) {
      setErrorMsg('Please enter your phone number.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        phone: trimmedPhone,
        password,
        options: {
          data: {
            full_name: trimmedName,
            accessiblecare_role: 'PATIENT',
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        navigate('/patient', { replace: true });
      } else {
        setVerificationRequired(true);
        setMessage(
          'Account created. Enter the 6-digit code sent to your phone to verify your number.'
        );
      }
    } catch (error) {
      setErrorMsg(
        error instanceof Error ? error.message : 'Registration failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();

    setErrorMsg(null);
    setMessage(null);

    const trimmedPhone = phone.trim();
    const trimmedOtp = otp.trim();

    if (!/^\d{6}$/.test(trimmedOtp)) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: trimmedPhone,
        token: trimmedOtp,
        type: 'sms',
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data.session) {
        setErrorMsg(
          'Phone verification succeeded, but no session was created. Please try signing in.'
        );
        return;
      }

      navigate('/patient', { replace: true });
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Phone verification failed.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.resend({
        type: 'sms',
        phone: phone.trim(),
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setMessage('A new verification code has been sent to your phone.');
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Could not resend verification code.'
      );
    } finally {
      setSubmitting(false);
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
          maxWidth: 440,
          padding: '2rem',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid #d8e1df',
          boxShadow: '0 10px 30px rgba(15, 118, 110, 0.08)',
        }}
      >
        <div style={{ marginBottom: '1.5rem' }}>
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

          <h1 style={{ margin: '.4rem 0', fontSize: '1.75rem' }}>
            {verificationRequired
              ? 'Verify your phone'
              : 'Create your account'}
          </h1>

          <p style={{ margin: 0, color: '#52615e' }}>
            {verificationRequired
              ? `Enter the 6-digit code sent to ${phone}.`
              : 'Create an account to request accessible hospital visits.'}
          </p>
        </div>

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

        {message && (
          <div
            role="status"
            style={{
              padding: '.75rem',
              marginBottom: '1rem',
              borderRadius: 8,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
            }}
          >
            {message}
          </div>
        )}

        {verificationRequired ? (
          <>
            <form
              onSubmit={handleVerifyOtp}
              style={{ display: 'grid', gap: '1rem' }}
            >
              <label style={{ display: 'grid', gap: '.35rem' }}>
                <span>Verification code</span>

                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 6)
                    )
                  }
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
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
                {submitting ? 'Verifying...' : 'Verify phone'}
              </button>
            </form>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={submitting}
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
              Resend code
            </button>
          </>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'grid', gap: '1rem' }}
          >
            <label style={{ display: 'grid', gap: '.35rem' }}>
              <span>Full name</span>

              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            <label style={{ display: 'grid', gap: '.35rem' }}>
              <span>Phone number</span>

              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                placeholder="+91 98765 43210"
                autoComplete="tel"
              />
            </label>

            <label style={{ display: 'grid', gap: '.35rem' }}>
              <span>Password</span>

              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </label>

            <label style={{ display: 'grid', gap: '.35rem' }}>
              <span>Confirm password</span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                required
                minLength={6}
                autoComplete="new-password"
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
              {submitting
                ? 'Creating account...'
                : 'Create account'}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/login')}
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
          Already have an account? Sign in
        </button>
      </div>
    </div>
  );
}

