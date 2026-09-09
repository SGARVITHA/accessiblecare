import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, StatusBadge, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { Appointment, InterpreterStatus } from '../../types/patient';
import './AppointmentDetailsPage.css';

export const AppointmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [interpreterStatus, setInterpreterStatus] = useState<InterpreterStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const targetId = id || 'A501';
        const [apptData, interpData] = await Promise.all([
          patientService.getAppointment(targetId),
          patientService.getInterpreterStatus(targetId),
        ]);

        if (!apptData) {
          setError('Unable to load appointment details. The appointment may not exist or has been updated.');
        } else {
          setAppointment(apptData);
          setInterpreterStatus(interpData);
          setCheckedIn(apptData.status === 'CHECKED_IN');
        }
      } catch (err) {
        console.error('Failed to load appointment details:', err);
        setError('Unable to load appointment details right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleCheckIn = () => {
    setCheckedIn(true);
  };

  if (loading) {
    return (
      <div className="appointment-details-loading">
        <Card padding="large">
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading appointment details...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="appointment-details-error">
        <PageHeader
          eyebrow="Appointment Details"
          title="Appointment Information"
        />
        <Card padding="large">
          <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <h2 style={{ fontSize: '18px', color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>
              Appointment Not Available
            </h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
              {error || 'Unable to display appointment details.'}
            </p>
            <Button variant="ghost" onClick={() => navigate('/patient')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="appointment-details-page">
      <nav className="appointment-breadcrumb" aria-label="Breadcrumb">
        <button onClick={() => navigate('/patient')} className="breadcrumb-link">
          Dashboard
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Appointment {appointment.id}</span>
      </nav>

      <PageHeader
        eyebrow={`Appointment Ref: ${appointment.id}`}
        title={`${appointment.department} Consultation`}
        description={`Scheduled with ${appointment.doctor_name}`}
        action={
          <StatusBadge status={checkedIn ? 'ready' : 'confirmed'} label={checkedIn ? 'Checked In' : 'Scheduled'} />
        }
      />

      <div className="appointment-grid">
        {/* Main Details Card */}
        <div className="appointment-main-column">
          <Card padding="large">
            <h2 className="section-title">Visit Information</h2>
            
            <div className="info-rows">
              <div className="info-row">
                <span className="info-label">Doctor</span>
                <span className="info-value">{appointment.doctor_name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Department</span>
                <span className="info-value">{appointment.department}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Date & Time</span>
                <span className="info-value highlight-value">{appointment.appointment_time}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Location</span>
                <span className="info-value">{appointment.location}</span>
              </div>
              {appointment.notes && (
                <div className="info-row">
                  <span className="info-label">Visit Reason</span>
                  <span className="info-value">{appointment.notes}</span>
                </div>
              )}
            </div>

            <div className="checkin-action-area">
              {checkedIn ? (
                <div className="checked-in-banner">
                  <span className="check-icon">✓</span>
                  <div>
                    <strong>Checked In Online</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                      Please proceed directly to {appointment.location}. Your interpreter has been notified.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="checkin-prompt">
                  <p className="checkin-text">Ready for your visit? Complete online check-in upon arrival.</p>
                  <Button variant="primary" size="large" onClick={handleCheckIn}>
                    Confirm Arrival & Check In Now
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Accessibility Confirmation Card */}
          <Card padding="large">
            <h2 className="section-title">Arranged Accessibility Support</h2>
            <div className="accessibility-support-box">
              <div className="support-status-line">
                <span className="support-badge-icon">🤟</span>
                <div>
                  <strong>Indian Sign Language (ISL) Interpreter Arranged</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                    Human communication support is confirmed for this appointment.
                  </p>
                </div>
              </div>

              {interpreterStatus && (
                <div className="interpreter-mini-details">
                  <div className="mini-detail">
                    <span className="detail-label">Assigned Interpreter</span>
                    <span className="detail-val">{interpreterStatus.interpreter_name || 'Assigned Specialist'}</span>
                  </div>
                  <div className="mini-detail">
                    <span className="detail-label">Mode</span>
                    <span className="detail-val">{interpreterStatus.communication_mode === 'IN_PERSON' ? 'In-Person (On site)' : 'Remote VRI'}</span>
                  </div>
                  <div className="mini-detail">
                    <span className="detail-label">Meeting Location</span>
                    <span className="detail-val">{interpreterStatus.meeting_point || appointment.location}</span>
                  </div>
                </div>
              )}

              <div className="support-actions">
                <Button variant="secondary" onClick={() => navigate('/patient/interpreter')}>
                  View Full Interpreter Status
                </Button>
                <Button variant="ghost" onClick={() => navigate('/patient/accessibility')}>
                  Update Preferences
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar Guidance Rail */}
        <div className="appointment-side-column">
          <Card padding="medium">
            <h3 className="side-title">Arrival Steps</h3>
            <ol className="arrival-steps">
              <li>Proceed to Outpatient Block B, Floor 2.</li>
              <li>Scan check-in or present MRN P1024 at reception desk.</li>
              <li>Your ISL interpreter will meet you at the reception desk.</li>
            </ol>
          </Card>

          <Card padding="medium">
            <h3 className="side-title">Need Quick Assistance?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
              Use pre-configured phrases to communicate with reception or request help.
            </p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/patient/communication')}>
              Open Quick Communication
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;
