import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import staffAppointmentRequestService from '../../services/staffAppointmentRequestService';
import type { AppointmentRequest } from '../../types/patient';

export default function StaffAppointmentRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = () => {
    setIsLoading(true);
    setError(null);
    staffAppointmentRequestService.list()
      .then(setRequests)
      .catch(() => setError('Unable to load appointment requests.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadRequests(); }, []);

  const pending = requests.filter((request) => request.status === 'PENDING');

  return (
    <div>
      <PageHeader
        eyebrow="APPOINTMENT REQUESTS"
        title="Appointment Requests"
        description="Review patient appointment requests and confirm the hospital appointment when ready."
        action={<Button variant="secondary" onClick={loadRequests}>Refresh</Button>}
      />

      {isLoading && <p className="body-large">Loading appointment requests...</p>}
      {error && <Card padding="large"><p className="body-medium">{error}</p><Button variant="primary" onClick={loadRequests}>Retry</Button></Card>}

      {!isLoading && !error && (
        <Card padding="large">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
            <div>
              <h2 className="title-large" style={{ margin: 0 }}>Pending Requests</h2>
              <p className="body-medium" style={{ margin: '4px 0 0', color: 'var(--color-on-surface-variant)' }}>
                {pending.length} request{pending.length === 1 ? '' : 's'} waiting for hospital confirmation.
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <p className="body-medium">No appointment requests have been submitted.</p>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {requests.map((request) => (
                <div key={request.id} style={{ border: '1px solid var(--color-outline-variant)', borderRadius: 'var(--radius-medium)', padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{request.patient_name || 'Patient'}</strong>
                      {request.patient_phone && <div className="body-small">{request.patient_phone}</div>}
                      <div className="body-medium" style={{ marginTop: '6px' }}>
                        {request.department || 'Department'} · {request.preferred_date}
                        {request.preferred_time ? ` · ${request.preferred_time}` : request.preferred_time_window ? ` · ${request.preferred_time_window}` : ''}
                      </div>
                    </div>
                    <StatusBadge
                      status={request.status === 'CONFIRMED' ? 'confirmed' : request.status === 'REJECTED' ? 'cancelled' : 'pending'}
                      label={request.status === 'PENDING' ? 'Pending' : request.status === 'CONFIRMED' ? 'Confirmed' : 'Rejected'}
                    />
                  </div>
                  <div style={{ marginTop: 'var(--space-3)', color: 'var(--color-on-surface-variant)' }}>
                    {request.communication_preference.replaceAll('_', ' ')}
                    {request.interpreter_required ? ` · Interpreter: ${request.preferred_interpreter_mode || 'Not specified'}` : ' · Interpreter not required'}
                    {request.companion_present ? ` · Companion${request.companion_assists_communication ? ' assists communication' : ''}` : ' · No companion'}
                  </div>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <Button variant="secondary" onClick={() => navigate(`/staff/appointment-requests/${encodeURIComponent(request.id)}`)}>Review Request</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
