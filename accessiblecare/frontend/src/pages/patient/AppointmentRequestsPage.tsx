import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import patientService from '../../services/patientService';
import type { AppointmentRequest } from '../../types/patient';

const statusLabel: Record<AppointmentRequest['status'], string> = {
  PENDING: 'Waiting for hospital confirmation',
  CONFIRMED: 'Appointment confirmed',
  REJECTED: 'Request not confirmed',
};

export default function AppointmentRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    patientService.getAppointmentRequests()
      .then(setRequests)
      .catch(() => setError('We couldn’t load your appointment requests right now.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="APPOINTMENT REQUESTS"
        title="My appointment requests"
        description="Track requests you have submitted to the hospital. A request becomes an appointment only after hospital confirmation."
        action={<Button variant="primary" onClick={() => navigate('/patient/appointment-request')}>Request an Appointment</Button>}
      />

      {isLoading && <p className="body-large">Loading your requests...</p>}
      {error && <p className="body-medium" role="alert">{error}</p>}

      {!isLoading && !error && requests.length === 0 && (
        <Card padding="large">
          <h2 className="title-large">No appointment requests yet</h2>
          <p className="body-medium">When you need a new appointment, you can submit your preferred time and accessibility requirements here.</p>
          <Button variant="primary" onClick={() => navigate('/patient/appointment-request')}>Request an Appointment</Button>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
        {requests.map((request) => (
          <Card key={request.id} padding="large">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div>
                <h2 className="title-large">{request.department || 'Hospital appointment'}</h2>
                <p className="body-medium">Preferred date: {request.preferred_date}</p>
                <p className="body-medium">{request.preferred_time ? `Preferred time: ${request.preferred_time}` : `Preferred window: ${request.preferred_time_window}`}</p>
              </div>
              <strong>{statusLabel[request.status]}</strong>
            </div>
            {request.status === 'CONFIRMED' && request.appointment_id && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="primary" onClick={() => navigate(`/patient/appointments/${encodeURIComponent(request.appointment_id as string)}`)}>View Appointment</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
