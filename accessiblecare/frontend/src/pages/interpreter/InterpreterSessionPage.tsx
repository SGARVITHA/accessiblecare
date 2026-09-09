import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type { VideoSessionState } from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterSessionPage.css';

export default function InterpreterSessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sessionId = id || 'VS-502';

  const [session, setSession] = useState<VideoSessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cueSent, setCueSent] = useState(false);

  useEffect(() => {
    let active = true;
    interpreterService.getVideoSession(sessionId).then((data) => {
      if (active) {
        setSession(data);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const handleToggleAudio = async () => {
    if (!session) return;
    const updated = await interpreterService.updateVideoSession(sessionId, {
      audio_enabled: !session.audio_enabled,
    });
    setSession(updated);
  };

  const handleToggleVideo = async () => {
    if (!session) return;
    const updated = await interpreterService.updateVideoSession(sessionId, {
      video_enabled: !session.video_enabled,
    });
    setSession(updated);
  };

  const handleToggleCaptions = async () => {
    if (!session) return;
    const updated = await interpreterService.updateVideoSession(sessionId, {
      captions_enabled: !session.captions_enabled,
    });
    setSession(updated);
  };

  const handleTogglePin = async () => {
    if (!session) return;
    const updated = await interpreterService.updateVideoSession(sessionId, {
      pin_patient_feed: !session.pin_patient_feed,
    });
    setSession(updated);
  };

  const handleLifecycleChange = async (nextStatus: 'READY' | 'ACTIVE' | 'ENDED') => {
    if (!session) return;
    const updated = await interpreterService.updateVideoSession(sessionId, {
      status: nextStatus,
      started_at: nextStatus === 'ACTIVE' ? '11:30 AM' : session.started_at,
    });
    setSession(updated);
  };

  const handleSendVisualCue = () => {
    setCueSent(true);
    setTimeout(() => setCueSent(false), 3000);
  };

  if (isLoading || !session) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Connecting to secure VRI tele-health gateway...</p>
      </div>
    );
  }

  return (
    <div className="ac-int-session-page">
      <div>
        <Link
          to="/interpreter/assignments"
          style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', gap: '4px' }}
        >
          ← Return to Assignments Roster
        </Link>
      </div>

      {/* Header */}
      <div className="ac-int-session-header">
        <div>
          <h1 className="ac-int-session-header__title">
            Remote VRI Session Console: {session.patient_name}
          </h1>
          <div className="ac-int-session-header__meta">
            Session ID: <strong>{session.session_id}</strong> • Encounter Ref: {session.appointment_id}{' '}
            • Department: {session.department} • Physician: {session.doctor_name}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {session.status === 'READY' ? (
            <StatusBadge status="ready" label="Gateway Ready (Standby)" />
          ) : session.status === 'ACTIVE' ? (
            <StatusBadge status="confirmed" label="Live Session Active" />
          ) : (
            <StatusBadge status="unavailable" label="Session Ended" />
          )}

          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate('/interpreter/assignments')}
          >
            Exit Console
          </Button>
        </div>
      </div>

      {cueSent && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde047',
            padding: '10px 16px',
            borderRadius: '8px',
            color: '#854d0e',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
          role="status"
        >
          ⚡ High-Visibility Visual Attention Cue flashed on Patient Devika Pillai's screen.
        </div>
      )}

      {/* Layout: Main Video Window + Sidebar Info */}
      <div className="ac-int-session-layout">
        {/* Main Video Arena */}
        <section className="ac-int-video-arena" aria-label="Remote Video Feed">
          {/* Signal Indicator */}
          <div className="ac-int-feed-badge">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: session.status === 'ACTIVE' ? '#34d399' : '#fbbf24',
              }}
            />
            <span>
              {session.connection_quality} SIGNAL •{' '}
              {session.status === 'ACTIVE' ? 'LIVE TRANSMISSION' : 'WAITING FOR CLINICIAN'}
            </span>
          </div>

          {/* Self View PiP */}
          <div className="ac-int-pip-self">
            <div style={{ fontSize: '1.25rem', marginBottom: 2 }}>🤟</div>
            <span>Interpreter Feed</span>
            <span style={{ fontSize: '0.6875rem', color: '#6ee7b7' }}>
              {session.video_enabled ? 'Camera Active' : 'Video Muted'}
            </span>
          </div>

          {/* Center Feed Content */}
          <div className="ac-int-video-feed">
            <div className="ac-int-feed-avatar">
              {session.patient_name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', color: '#f0fdfa' }}>
              {session.patient_name}
            </h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#99f6e4' }}>
              AccessibleCare Mobile Web Client • Patient In-Room Display
            </p>

            {session.status === 'READY' && (
              <div
                style={{
                  marginTop: '16px',
                  backgroundColor: 'rgba(15, 118, 110, 0.4)',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                }}
              >
                Waiting for Dr. Varma and Patient to begin interpretation...
              </div>
            )}

            {session.status === 'ACTIVE' && session.captions_enabled && (
              <div className="ac-int-captions-overlay">
                [Live ISL Closed Captions]: "Dr. Varma: Good morning Devika. We are reviewing your
                cataract eye drops progress today..."
              </div>
            )}

            {session.status === 'ENDED' && (
              <div
                style={{
                  marginTop: '16px',
                  backgroundColor: 'rgba(186, 26, 26, 0.4)',
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                }}
              >
                Interpretation encounter completed and logged.
              </div>
            )}
          </div>

          {/* Interactive Toolbar */}
          <div className="ac-int-session-toolbar">
            <div className="ac-int-toolbar-group">
              <button
                className={`ac-int-tool-btn ${session.audio_enabled ? 'ac-int-tool-btn--active' : ''}`}
                onClick={handleToggleAudio}
                title="Toggle microphone pass-through"
              >
                {session.audio_enabled ? '🎤 Mic On' : '🔇 Mic Muted'}
              </button>

              <button
                className={`ac-int-tool-btn ${session.video_enabled ? 'ac-int-tool-btn--active' : ''}`}
                onClick={handleToggleVideo}
                title="Toggle interpreter camera"
              >
                {session.video_enabled ? '📹 Video On' : '📷 Video Off'}
              </button>

              <button
                className={`ac-int-tool-btn ${
                  session.captions_enabled ? 'ac-int-tool-btn--active' : ''
                }`}
                onClick={handleToggleCaptions}
                title="Toggle real-time closed captions"
              >
                💬 {session.captions_enabled ? 'Captions On' : 'Captions Off'}
              </button>

              <button
                className={`ac-int-tool-btn ${
                  session.pin_patient_feed ? 'ac-int-tool-btn--active' : ''
                }`}
                onClick={handleTogglePin}
                title="Pin patient video feed to high-resolution tile"
              >
                📌 {session.pin_patient_feed ? 'Patient Pinned' : 'Pin Feed'}
              </button>
            </div>

            <div className="ac-int-toolbar-group">
              {session.status === 'READY' && (
                <button
                  className="ac-int-tool-btn ac-int-tool-btn--active"
                  onClick={() => handleLifecycleChange('ACTIVE')}
                  style={{ backgroundColor: '#059669', borderColor: '#34d399' }}
                >
                  ▶ Start Live Session
                </button>
              )}

              {session.status === 'ACTIVE' && (
                <button
                  className="ac-int-tool-btn ac-int-tool-btn--danger"
                  onClick={() => handleLifecycleChange('ENDED')}
                >
                  ⏹ End Session
                </button>
              )}

              {session.status === 'ENDED' && (
                <button
                  className="ac-int-tool-btn"
                  onClick={() => handleLifecycleChange('ACTIVE')}
                >
                  ↺ Reconnect
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Clinical Sidebar */}
        <aside className="ac-int-session-sidebar">
          <div className="ac-int-session-sidebox">
            <h3 className="ac-int-sidebox-title">Patient Communication Profile</h3>
            <div style={{ fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block', fontSize: '0.75rem' }}>
                  PREFERRED MODE
                </span>
                <strong>ISL (Indian Sign Language)</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block', fontSize: '0.75rem' }}>
                  VRI FALLBACK
                </span>
                <span>Pre-authorized by Patient & Coordinator</span>
              </div>
              <div>
                <span style={{ color: 'var(--color-outline)', display: 'block', fontSize: '0.75rem' }}>
                  ORIENTATION
                </span>
                <span>Doctor speaks slowly, interpreter signs on primary high-contrast stream.</span>
              </div>
            </div>

            <div style={{ paddingTop: '8px', borderTop: '1px dashed var(--color-surface-high)' }}>
              <Button variant="secondary" size="small" onClick={handleSendVisualCue}>
                ⚡ Send Visual Attention Cue
              </Button>
            </div>
          </div>

          <div className="ac-int-session-sidebox">
            <h3 className="ac-int-sidebox-title">Clinical Encounter Notes</h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
              Ophthalmology follow-up post left eye cataract procedure. Physician requires
              verification of medication compliance and visual acuity check.
            </p>
          </div>

          <div className="ac-int-session-sidebox" style={{ backgroundColor: '#f0fdfa' }}>
            <h3 className="ac-int-sidebox-title" style={{ color: '#0f766e' }}>
              Interpreter Tele-Station
            </h3>
            <div style={{ fontSize: '0.8125rem', color: '#134e4a' }}>
              <div>Console: <strong>Tele-ISL Pod 2 Console</strong></div>
              <div>Codec: VP9 / WebRTC 1080p</div>
              <div>Latency: 28ms (Optimal)</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
