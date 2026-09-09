import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, StatusBadge, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { Appointment, InterpreterStatus } from '../../types/patient';
import './InterpreterStatusPage.css';

export const InterpreterStatusPage: React.FC = () => {
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [interpreterStatus, setInterpreterStatus] = useState<InterpreterStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [apptData, interpData] = await Promise.all([
          patientService.getAppointment('A501'),
          patientService.getInterpreterStatus('A501'),
        ]);
        setAppointment(apptData);
        setInterpreterStatus(interpData);
      } catch (err) {
        console.error('Failed to load interpreter status:', err);
        setError('Unable to load interpreter status right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Card padding="large">
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading interpreter coordination status...</p>
        </div>
      </Card>
    );
  }

  if (error || !interpreterStatus) {
    return (
      <div className="interpreter-status-error">
        <PageHeader
          eyebrow="Interpreter Support"
          title="Interpreter Coordination Status"
        />
        <Card padding="large">
          <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>
              Status Unavailable
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
              {error || 'No active interpreter assignment found for this visit.'}
            </p>
            <Button variant="ghost" onClick={() => navigate('/patient')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const isConfirmed = interpreterStatus.status === 'CONFIRMED';

  return (
    <div className="interpreter-status-page">
      <PageHeader
        eyebrow="Hospital Accessibility Support"
        title="Interpreter Status"
        description="Real-time arrangement status of your sign language interpreter for today's appointment."
        action={<StatusBadge status={isConfirmed ? 'confirmed' : 'pending'} />}
      />

      <div className="interpreter-grid">
        {/* Main Status Showcase */}
        <div className="interpreter-main-column">
          <Card padding="large">
            <div className="status-hero">
              <div className="status-icon-badge">
                {isConfirmed ? '🤟' : '⏳'}
              </div>
              <div className="status-hero-text">
                <span className="hero-eyebrow">Current Support State</span>
                <h2 className="hero-title">
                  {isConfirmed ? 'Sign Language Interpreter Confirmed' : 'Coordinating Interpreter'}
                </h2>
                <p className="hero-description">
                  {isConfirmed
                    ? 'Qualified human communication support has been locked and confirmed for your clinical consultation.'
                    : 'The hospital accessibility team is confirming your assigned interpreter.'}
                </p>
              </div>
            </div>

            {/* Assigned Specialist Details */}
            <div className="specialist-card">
              <div className="specialist-avatar">
                <span>{interpreterStatus.interpreter_name ? interpreterStatus.interpreter_name.charAt(0) : 'I'}</span>
              </div>
              <div className="specialist-info">
                <span className="specialist-role">Assigned Specialist</span>
                <h3 className="specialist-name">{interpreterStatus.interpreter_name || 'Assigned Interpreter'}</h3>
                <span className="specialist-level">{interpreterStatus.qualification_level}</span>
              </div>
              <div className="mode-pill">
                <span>{interpreterStatus.communication_mode === 'IN_PERSON' ? 'In-Person' : 'Remote VRI'}</span>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="detail-table-grid">
              <div className="detail-cell">
                <span className="cell-label">Meeting Point</span>
                <span className="cell-value">{interpreterStatus.meeting_point || 'Reception Desk'}</span>
              </div>

              <div className="detail-cell">
                <span className="cell-label">Arrival / Availability Status</span>
                <span className="cell-value highlight-text">{interpreterStatus.eta || 'On Schedule'}</span>
              </div>

              <div className="detail-cell">
                <span className="cell-label">Assigned Appointment</span>
                <span className="cell-value">{appointment ? `${appointment.doctor_name} (${appointment.department})` : 'ENT Follow-up'}</span>
              </div>

              <div className="detail-cell">
                <span className="cell-label">Scheduled Time</span>
                <span className="cell-value">{appointment ? appointment.appointment_time : '10:30 AM'}</span>
              </div>
            </div>
          </Card>

          {/* Contingency / Backup Support Policy Banner */}
          <Card padding="large">
            <h3 className="contingency-title">Hospital Backup & Remote Fallback Support</h3>
            <p className="contingency-desc">
              {interpreterStatus.contingency_note ||
                'If your in-person interpreter is delayed, a remote Video Remote Interpreter (VRI) tablet will automatically connect.'}
            </p>
            <div className="contingency-features">
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Certified ISL Interpreter Guaranteed</span>
              </div>
              <div className="feature-item">
                <span className="feature-check">✓</span>
                <span>Zero Delay Video Fallback Ready</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Actions & Next Steps */}
        <div className="interpreter-side-column">
          <Card padding="medium">
            <h3 className="side-title">What Happens Next?</h3>
            <ul className="next-steps-list">
              <li>Arrive at ENT Reception 15 minutes before 10:30 AM.</li>
              <li>Your interpreter will greet you at the floor entrance or reception desk.</li>
              <li>Together, you will enter Dr Sharma's consultation room.</li>
            </ul>
          </Card>

          <Card padding="medium">
            <h3 className="side-title">Need Assistance?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              If you are at reception and cannot locate your interpreter, notify desk staff immediately.
            </p>
            <div className="side-button-group">
              <Button variant="secondary" fullWidth onClick={() => navigate('/patient/communication')}>
                Quick Communication Desk
              </Button>
              <Button variant="ghost" fullWidth onClick={() => navigate('/patient/appointments/A501')}>
                View Appointment Details
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InterpreterStatusPage;
