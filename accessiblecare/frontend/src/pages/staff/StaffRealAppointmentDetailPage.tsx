import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import staffAppointmentService from '../../services/staffAppointmentService';
import type { Appointment } from '../../types/patient';

export default function StaffRealAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id) {
      setError('Appointment ID is missing.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    staffAppointmentService
      .get(id)
      .then((data) => {
        if (active) setAppointment(data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load appointment.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <Card padding="large" style={{ textAlign: 'center', margin: 'var(--space-6) 0' }}>
        <p className="body-large">Loading appointment...</p>
      </Card>
    );
  }

  if (error || !appointment) {
    return (
      <Card padding="large" style={{ textAlign: 'center', margin: 'var(--space-6) 0' }}>
        <h2 className="headline-small" style={{ color: 'var(--color-error)' }}>Appointment Not Found</h2>
        <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', margin: 'var(--space-4) 0' }}>
          {error || `Appointment ${id} could not be loaded.`}
        </p>
        <Link to="/staff/appointments">
          <Button variant="primary">Return to Appointments Roster</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Link to="/staff/appointments" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
          ← Back to Appointments
        </Link>
      </div>

      <Card padding="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap', marginBottom: 'var(--space-6)' }}>
          <div>
            <p className="label-large" style={{ color: 'var(--color-secondary)', marginBottom: '6px' }}>HOSPITAL APPOINTMENT</p>
            <h1 className="headline-medium" style={{ margin: 0 }}>Appointment {appointment.id}</h1>
            {appointment.external_id && (
              <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', marginTop: '6px' }}>
                Hospital reference: {appointment.external_id}
              </p>
            )}
          </div>
          <div style={{ fontWeight: 700 }}>{appointment.status}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          <div><strong>Department</strong><p>{appointment.department || '—'}</p></div>
          <div><strong>Doctor</strong><p>{appointment.doctor_name || 'Not specified'}</p></div>
          <div><strong>Appointment time</strong><p>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(appointment.appointment_time))}</p></div>
          <div><strong>Hospital</strong><p>{appointment.hospital || '—'}</p></div>
          <div><strong>Location</strong><p>{appointment.location || '—'}</p></div>
          <div><strong>Source</strong><p>{appointment.source || '—'}</p></div>
        </div>

        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-5)', borderTop: '1px solid var(--color-outline-variant)' }}>
          <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
            This appointment was created from the patient’s accessible visit request. Accessibility coordination is handled separately from the hospital appointment record.
          </p>
        </div>
      </Card>
    </div>
  );
}
