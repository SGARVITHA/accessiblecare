import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import staffAppointmentRequestService from '../../services/staffAppointmentRequestService';
import type { AppointmentRequest } from '../../types/patient';

const formatPreference = (value: string) => value.replaceAll('_', ' ');

export default function StaffAppointmentRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<AppointmentRequest | null>(null);
  const [appointmentTime, setAppointmentTime] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequest = () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    staffAppointmentRequestService.get(id)
      .then((loaded) => {
        setRequest(loaded);
        setDoctorName('');
      })
      .catch(() => setError('Unable to load this visit request.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { loadRequest(); }, [id]);

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    if (!id || !appointmentTime) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await staffAppointmentRequestService.confirm(id, {
        appointment_time: new Date(appointmentTime).toISOString(),
        doctor_name: doctorName.trim() || null,
      });
      navigate(`/staff/appointments/${encodeURIComponent(result.appointment_id)}`);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'Unable to confirm the appointment.');
      setIsSubmitting(false);
    }
  };

  const reject = async () => {
    if (!id || !window.confirm('Reject this visit request?')) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await staffAppointmentRequestService.reject(id);
      navigate('/staff/appointment-requests');
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Unable to reject the request.');
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <p className="body-large">Loading visit request...</p>;
  if (error && !request) return <Card padding="large"><p className="body-medium" role="alert">{error}</p><Button variant="secondary" onClick={() => navigate('/staff/appointment-requests')}>Back to Requests</Button></Card>;
  if (!request) return null;

  return (
    <div>
      <PageHeader
        eyebrow="ACCESSIBLE VISIT REQUEST"
        title={`Request from ${request.patient_name || 'Patient'}`}
        description="Review the patient's visit reason and accessibility requirements. Confirm the actual hospital appointment only when the doctor, date and time are known."
        action={<StatusBadge status={request.status === 'CONFIRMED' ? 'confirmed' : request.status === 'REJECTED' ? 'cancelled' : 'pending'} label={request.status} />}
      />

      <div style={{ display: 'grid', gap: 'var(--space-5)', maxWidth: '900px' }}>
        <Card padding="large">
          <h2 className="title-large">Visit request</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)', margin: 'var(--space-4) 0 0' }}>
            <div><dt className="body-small">Patient</dt><dd>{request.patient_name || '—'}</dd></div>
            <div><dt className="body-small">Phone</dt><dd>{request.patient_phone || '—'}</dd></div>
            <div><dt className="body-small">Department</dt><dd>{request.department || '—'}</dd></div>
            <div><dt className="body-small">Reason for visit</dt><dd>{request.reason_for_visit || '—'}</dd></div>
          </dl>
        </Card>

        <Card padding="large">
          <h2 className="title-large">Accessibility requirements</h2>
          <dl style={{ display: 'grid', gap: 'var(--space-4)', margin: 'var(--space-4) 0 0' }}>
            <div><dt className="body-small">Communication preference</dt><dd>{formatPreference(request.communication_preference)}</dd></div>
            <div><dt className="body-small">Interpreter required</dt><dd>{request.interpreter_required ? 'Yes' : 'No'}</dd></div>
            {request.interpreter_required && <>
              <div><dt className="body-small">Preferred interpreter mode</dt><dd>{formatPreference(request.preferred_interpreter_mode || 'Not specified')}</dd></div>
              <div><dt className="body-small">Remote fallback accepted</dt><dd>{request.remote_accepted ? 'Yes' : 'No'}</dd></div>
            </>}
            <div><dt className="body-small">Companion present</dt><dd>{request.companion_present ? 'Yes' : 'No'}</dd></div>
            {request.companion_present && <div><dt className="body-small">Companion assists communication</dt><dd>{request.companion_assists_communication ? 'Yes' : 'No'}</dd></div>}
            {request.accessibility_note && <div><dt className="body-small">Additional instruction</dt><dd>{request.accessibility_note}</dd></div>}
          </dl>
        </Card>

        {request.status === 'PENDING' && (
          <Card padding="large">
            <h2 className="title-large">Confirm hospital appointment</h2>
            <p className="body-medium">Enter the appointment actually arranged by the hospital. This creates the appointment record and moves the patient into the existing accessibility setup flow.</p>
            <form onSubmit={confirm} style={{ display: 'grid', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span>Appointment date and time</span>
                <input type="datetime-local" value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} required />
              </label>
              <label style={{ display: 'grid', gap: '6px' }}>
                <span>Doctor / clinician name</span>
                <input type="text" value={doctorName} onChange={(event) => setDoctorName(event.target.value)} placeholder="Enter the scheduled clinician" />
              </label>
              {error && <div role="alert">{error}</div>}
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Confirming...' : 'Confirm Appointment'}</Button>
                <Button type="button" variant="danger" onClick={reject} disabled={isSubmitting}>Reject Request</Button>
                <Button type="button" variant="secondary" onClick={() => navigate('/staff/appointment-requests')} disabled={isSubmitting}>Back</Button>
              </div>
            </form>
          </Card>
        )}

        {request.status === 'CONFIRMED' && request.appointment_id && (
          <Card padding="large">
            <h2 className="title-large">Appointment confirmed</h2>
            <p className="body-medium">The hospital appointment has been created. Accessibility coordination remains a separate step.</p>
            <Button variant="primary" onClick={() => navigate(`/staff/appointments/${encodeURIComponent(request.appointment_id!)}`)}>View Appointment</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
