import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button } from '../../components/ui';
import './InterpreterStatusPage.css';

export const InterpreterStatusPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="interpreter-status-page">
      <PageHeader
        eyebrow="Hospital Accessibility Support"
        title="Interpreter Status"
        description="Interpreter coordination is not yet connected to the current Patient workflow."
      />

      <div className="interpreter-grid">
        <div className="interpreter-main-column">
          <Card padding="large">
            <div className="status-hero">
              <div className="status-icon-badge" aria-hidden="true">⏳</div>
              <div className="status-hero-text">
                <span className="hero-eyebrow">Current Support State</span>
                <h2 className="hero-title">Interpreter coordination not yet available</h2>
                <p className="hero-description">
                  Your accessibility preferences can be saved and an appointment-specific accessibility visit can be confirmed.
                  Interpreter matching, assignment, availability, and fallback coordination are future workflows.
                </p>
              </div>
            </div>

            <div className="specialist-card">
              <div className="specialist-avatar" aria-hidden="true">🤟</div>
              <div className="specialist-info">
                <span className="specialist-role">Current capability</span>
                <h3 className="specialist-name">Accessibility request recorded</h3>
                <span className="specialist-level">No interpreter has been assigned by this application.</span>
              </div>
            </div>
          </Card>

          <Card padding="large">
            <h3 className="contingency-title">What AccessibleCare currently provides</h3>
            <p className="contingency-desc">
              You can maintain your standing communication preferences and confirm accessibility requirements for an existing appointment.
              The application does not currently claim that an interpreter has been matched, assigned, confirmed, or dispatched.
            </p>
            <div className="contingency-features">
              <div className="feature-item">
                <span className="feature-check" aria-hidden="true">✓</span>
                <span>Standing accessibility preferences can be saved</span>
              </div>
              <div className="feature-item">
                <span className="feature-check" aria-hidden="true">✓</span>
                <span>Appointment-specific accessibility status is supported</span>
              </div>
              <div className="feature-item">
                <span className="feature-check" aria-hidden="true">•</span>
                <span>Interpreter coordination is a future workflow</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="interpreter-side-column">
          <Card padding="medium">
            <h3 className="side-title">Need Assistance?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              For routine reception questions, use Quick Communication. Clinical communication still requires qualified interpretation.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/patient/communication')}>
              Quick Communication
            </Button>
          </Card>

          <Card padding="medium">
            <h3 className="side-title">View Your Appointments</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              Open an appointment to review its current accessibility setup and status.
            </p>
            <Button variant="ghost" fullWidth onClick={() => navigate('/patient/appointments')}>
              View Appointments
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterpreterStatusPage;
