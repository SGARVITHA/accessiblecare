import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader, Card, StatusBadge, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { Appointment, AccessibilityStatus } from '../../types/patient';
import './AppointmentDetailsPage.css';

export const AppointmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [accessibilityStatus, setAccessibilityStatus] = useState<AccessibilityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        if (!id) {
          setError('Appointment information is missing.');
          return;
        }
        const [apptData, statusData] = await Promise.all([
          patientService.getAppointment(id),
          patientService.getAccessibilityStatus(id),
        ]);

        if (!apptData) {
          setError('Unable to load appointment details. The appointment may not exist or has been updated.');
        } else {
          setAppointment(apptData);
          setAccessibilityStatus(statusData);
        }
      } catch (err) {
        console.error('Failed to load appointment details:', err);
        setError('Unable to load appointment details right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [id]);

  if (loading) {
    return <div className="appointment-details-loading"><Card padding="large"><div style={{ textAlign: 'center', padding: 'var(--space-8)' }}><p style={{ color: 'var(--color-on-surface-variant)' }}>Loading appointment details...</p></div></Card></div>;
  }

  if (error || !appointment) {
    return (
      <div className="appointment-details-error">
        <PageHeader eyebrow="Appointment Details" title="Appointment Information" />
        <Card padding="large"><div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '18px', color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>Appointment Not Available</h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>{error || 'Unable to display appointment details.'}</p>
          <Button variant="ghost" onClick={() => navigate('/patient/appointments')}>Return to Appointments</Button>
        </div></Card>
      </div>
    );
  }

  const isBackendCheckedIn = appointment.status === 'CHECKED_IN';

  return (
    <div className="appointment-details-page">
      <nav className="appointment-breadcrumb" aria-label="Breadcrumb">
        <button onClick={() => navigate('/patient')} className="breadcrumb-link">Dashboard</button>
        <span className="breadcrumb-separator">/</span>
        <button onClick={() => navigate('/patient/appointments')} className="breadcrumb-link">Appointments</button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Appointment {appointment.external_id || appointment.id}</span>
      </nav>

      <PageHeader
        eyebrow={`Appointment Ref: ${appointment.external_id || appointment.id}`}
        title={`${appointment.department || 'Hospital'} Consultation`}
        description={`Scheduled with ${appointment.doctor_name || 'your doctor'}`}
        action={<StatusBadge status={isBackendCheckedIn ? 'ready' : 'confirmed'} label={isBackendCheckedIn ? 'Checked In' : appointment.status.replaceAll('_', ' ')} />}
      />

      <div className="appointment-grid">
        <div className="appointment-main-column">
          <Card padding="large">
            <h2 className="section-title">Visit Information</h2>
            <div className="info-rows">
              <div className="info-row"><span className="info-label">Doctor</span><span className="info-value">{appointment.doctor_name || '—'}</span></div>
              <div className="info-row"><span className="info-label">Department</span><span className="info-value">{appointment.department || '—'}</span></div>
              <div className="info-row"><span className="info-label">Date & Time</span><span className="info-value highlight-value">{appointment.appointment_time}</span></div>
              <div className="info-row"><span className="info-label">Hospital</span><span className="info-value">{appointment.hospital || '—'}</span></div>
              {appointment.location && <div className="info-row"><span className="info-label">Location</span><span className="info-value">{appointment.location}</span></div>}
            </div>

            <div className="checkin-action-area">
              {isBackendCheckedIn ? (
                <div className="checked-in-banner">
                  <span className="check-icon" aria-hidden="true">✓</span>
                  <div>
                    <strong>Hospital check-in is recorded</strong>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>This status comes from the appointment record.</p>
                  </div>
                </div>
              ) : (
                <div className="checkin-prompt">
                  <p className="checkin-text">Hospital check-in is not connected to AccessibleCare in this phase.</p>
                  <Button variant="secondary" size="large" disabled>Check-in Not Available</Button>
                </div>
              )}
            </div>
          </Card>

          <Card padding="large">
            <h2 className="section-title">Accessibility Setup</h2>
            <div className="accessibility-support-box">
              <div className="support-status-line">
                <span className="support-badge-icon" aria-hidden="true">🤟</span>
                <div>
                  <strong>{accessibilityStatus?.configured ? 'Accessibility preferences configured' : 'Accessibility support not configured yet'}</strong>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
                    {accessibilityStatus?.configured ? `Current state: ${accessibilityStatus.status.replaceAll('_', ' ')}` : 'Set your communication preferences for this appointment.'}
                  </p>
                </div>
              </div>
              <div className="support-actions">
                <Button variant="secondary" onClick={() => navigate('/patient/accessibility', { state: { appointmentId: appointment.id } })}>
                  {accessibilityStatus?.configured ? 'View Accessibility Setup' : 'Set Up Accessibility'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="appointment-side-column">
          <Card padding="medium">
            <h3 className="side-title">Arrival Steps</h3>
            <ol className="arrival-steps">
              <li>Proceed to your hospital and department reception.</li>
              <li>Present your appointment reference at reception.</li>
              <li>Use your accessibility status to review the support recorded for this appointment.</li>
            </ol>
          </Card>

          <Card padding="medium">
            <h3 className="side-title">Need Quick Assistance?</h3>
            <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>Use routine phrases for reception or non-clinical assistance.</p>
            <Button variant="secondary" fullWidth onClick={() => navigate('/patient/communication')}>Open Quick Communication</Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsPage;
