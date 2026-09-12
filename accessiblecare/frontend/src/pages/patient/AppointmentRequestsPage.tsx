import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import patientService from '../../services/patientService';
import type { Appointment, AppointmentRequest } from '../../types/patient';
import './AppointmentRequestsPage.css';

const statusMeta: Record<AppointmentRequest['status'], { label: string; detail: string; className: string }> = {
  PENDING: {
    label: 'PENDING HOSPITAL CONFIRMATION',
    detail: 'The hospital team is reviewing your request. Your appointment is not confirmed yet.',
    className: 'request-status request-status--pending',
  },
  CONFIRMED: {
    label: 'APPOINTMENT CONFIRMED',
    detail: 'The hospital has confirmed your visit. Your appointment details are shown below.',
    className: 'request-status request-status--confirmed',
  },
  REJECTED: {
    label: 'REQUEST NOT CONFIRMED',
    detail: 'The hospital could not confirm this request. Please contact the hospital team if you need help.',
    className: 'request-status request-status--rejected',
  },
};

const communicationLabel: Record<AppointmentRequest['communication_preference'], string> = {
  ISL: 'Indian Sign Language (ISL)',
  TEXT: 'Text',
  SPEECH_TO_TEXT: 'Speech-to-text',
  COMBINATION: 'Combination',
};

const interpreterLabel: Record<NonNullable<AppointmentRequest['preferred_interpreter_mode']>, string> = {
  IN_PERSON: 'In-person preferred',
  REMOTE: 'Remote preferred',
  EITHER: 'In-person or remote',
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};

function RequestCard({
  request,
  appointment,
  onViewAppointment,
}: {
  request: AppointmentRequest;
  appointment?: Appointment | null;
  onViewAppointment: (id: string) => void;
}) {
  const status = statusMeta[request.status];

  return (
    <Card padding="large">
      <article className="request-card">
        <div className="request-card__top">
          <div>
            <p className="request-card__eyebrow">REQUEST #{request.id.slice(0, 8).toUpperCase()}</p>
            <h2 className="request-card__title">{request.department || 'Hospital visit'}</h2>
            <p className="request-card__reason">{request.reason_for_visit}</p>
          </div>
          <div className={status.className} role="status">
            {status.label}
          </div>
        </div>

        <div className="request-status-banner">
          <span className="request-status-banner__indicator" aria-hidden="true" />
          <p>{status.detail}</p>
        </div>

        {request.status === 'CONFIRMED' && appointment && (
          <section className="confirmed-appointment" aria-label="Confirmed appointment">
            <div>
              <p className="section-label">YOUR APPOINTMENT</p>
              <h3>{formatDateTime(appointment.appointment_time)}</h3>
              <p>
                {appointment.doctor_name ? `Dr. ${appointment.doctor_name}` : 'Doctor details will appear here'}
                {appointment.location ? ` · ${appointment.location}` : ''}
              </p>
            </div>
            <Button variant="primary" onClick={() => onViewAppointment(appointment.id)}>
              View appointment
            </Button>
          </section>
        )}

        {request.status === 'CONFIRMED' && !appointment && request.appointment_id && (
          <div className="request-loading-note">Loading your confirmed appointment details...</div>
        )}

        <section className="request-details" aria-label="Accessibility requirements">
          <div className="request-detail">
            <span>Communication</span>
            <strong>{communicationLabel[request.communication_preference]}</strong>
          </div>
          <div className="request-detail">
            <span>Interpreter</span>
            <strong>
              {request.interpreter_required
                ? interpreterLabel[request.preferred_interpreter_mode || 'EITHER']
                : 'Not required'}
            </strong>
          </div>
          {request.interpreter_required && (
            <div className="request-detail">
              <span>Remote fallback</span>
              <strong>{request.remote_accepted ? 'Accepted' : 'Not accepted'}</strong>
            </div>
          )}
          <div className="request-detail">
            <span>Companion</span>
            <strong>
              {request.companion_present
                ? request.companion_assists_communication
                  ? 'Yes · assists communication'
                  : 'Yes'
                : 'No'}
            </strong>
          </div>
        </section>

        {request.accessibility_note && (
          <div className="request-note">
            <span>Accessibility note</span>
            <p>{request.accessibility_note}</p>
          </div>
        )}
      </article>
    </Card>
  );
}

export default function AppointmentRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [appointments, setAppointments] = useState<Record<string, Appointment>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const loadedRequests = await patientService.getAppointmentRequests();
        if (cancelled) return;
        setRequests(loadedRequests);

        const confirmed = loadedRequests.filter(
          (request) => request.status === 'CONFIRMED' && request.appointment_id,
        );
        const loadedAppointments = await Promise.all(
          confirmed.map(async (request) => {
            const appointment = await patientService.getAppointment(request.appointment_id as string);
            return appointment ? [request.appointment_id as string, appointment] as const : null;
          }),
        );

        if (!cancelled) {
          setAppointments(Object.fromEntries(loadedAppointments.filter(Boolean) as [string, Appointment][]));
        }
      } catch {
        if (!cancelled) setError('We couldn’t load your appointment requests right now.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="appointment-requests-page">
      <PageHeader
        eyebrow="YOUR REQUESTS"
        title="My appointment requests"
        description="See what you have asked the hospital for and know exactly when a visit has been confirmed."
        action={
          <Button variant="primary" onClick={() => navigate('/patient/appointment-request')}>
            Request a visit
          </Button>
        }
      />

      {isLoading && <p className="body-large">Loading your requests...</p>}
      {error && <p className="body-medium request-error" role="alert">{error}</p>}

      {!isLoading && !error && requests.length === 0 && (
        <Card padding="large">
          <div className="empty-requests">
            <p className="request-card__eyebrow">NO REQUESTS YET</p>
            <h2 className="title-large">Need to see a doctor?</h2>
            <p className="body-medium">
              Submit your visit reason and accessibility requirements. The hospital team will confirm the actual appointment details.
            </p>
            <Button variant="primary" onClick={() => navigate('/patient/appointment-request')}>
              Request a visit
            </Button>
          </div>
        </Card>
      )}

      <div className="request-list">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            appointment={request.appointment_id ? appointments[request.appointment_id] : undefined}
            onViewAppointment={(id) => navigate(`/patient/appointments/${encodeURIComponent(id)}`)}
          />
        ))}
      </div>
    </div>
  );
}
