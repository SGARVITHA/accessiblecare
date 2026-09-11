import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import patientService from '../../services/patientService';
import type { AppointmentRequestCreate, AppointmentRequestDepartment, CommunicationPreference, InterpreterMode } from '../../types/patient';
import './AppointmentRequestPage.css';

const communicationOptions: Array<{ value: CommunicationPreference; label: string }> = [
  { value: 'ISL', label: 'Indian Sign Language (ISL)' },
  { value: 'TEXT', label: 'Text' },
  { value: 'SPEECH_TO_TEXT', label: 'Speech-to-text' },
  { value: 'COMBINATION', label: 'Combination' },
];

const modeOptions: Array<{ value: InterpreterMode; label: string }> = [
  { value: 'IN_PERSON', label: 'In-person preferred' },
  { value: 'REMOTE', label: 'Remote preferred' },
  { value: 'EITHER', label: 'Either' },
];

export default function AppointmentRequestPage() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<AppointmentRequestDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [timeWindow, setTimeWindow] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference | ''>('');
  const [interpreterRequired, setInterpreterRequired] = useState<boolean | null>(null);
  const [preferredMode, setPreferredMode] = useState<InterpreterMode | ''>('');
  const [remoteAccepted, setRemoteAccepted] = useState<boolean | null>(null);
  const [companionPresent, setCompanionPresent] = useState<boolean | null>(null);
  const [companionAssists, setCompanionAssists] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    patientService.getAppointmentRequestDepartments()
      .then((rows) => {
        setDepartments(rows);
        setIsLoading(false);
      })
      .catch(() => {
        setError('We couldn’t load the hospital departments right now.');
        setIsLoading(false);
      });
  }, []);

  const canSubmit = useMemo(
    () => Boolean(
      departmentId &&
      preferredDate &&
      (preferredTime || timeWindow) &&
      communicationPreference &&
      interpreterRequired !== null &&
      companionPresent !== null &&
      (!interpreterRequired || (preferredMode && remoteAccepted !== null)) &&
      (!companionPresent || companionAssists !== null) &&
      !isSubmitting,
    ),
    [departmentId, preferredDate, preferredTime, timeWindow, communicationPreference, interpreterRequired, preferredMode, remoteAccepted, companionPresent, companionAssists, isSubmitting],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !communicationPreference || interpreterRequired === null || companionPresent === null) return;

    setError(null);
    setIsSubmitting(true);
    const payload: AppointmentRequestCreate = {
      department_id: departmentId,
      preferred_date: preferredDate,
      preferred_time: preferredTime || null,
      preferred_time_window: timeWindow || null,
      communication_preference: communicationPreference,
      interpreter_required: interpreterRequired,
      preferred_interpreter_mode: interpreterRequired ? (preferredMode || null) : null,
      remote_accepted: interpreterRequired ? remoteAccepted === true : false,
      companion_present: companionPresent,
      companion_assists_communication: companionPresent ? companionAssists === true : false,
    };

    try {
      await patientService.createAppointmentRequest(payload);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We couldn’t submit your request right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="ac-appointment-request-page">
        <Card padding="large" className="ac-appointment-request-page__success">
          <span className="ac-appointment-request-page__eyebrow">REQUEST SUBMITTED</span>
          <h1 className="headline-medium">Your appointment request is waiting for hospital confirmation.</h1>
          <p className="body-large">
            The hospital will review your requested department, preferred time, and accessibility requirements before confirming an appointment.
          </p>
          <div className="ac-appointment-request-page__actions">
            <Button variant="primary" size="large" onClick={() => navigate('/patient/appointment-requests')}>
              View My Requests
            </Button>
            <Button variant="secondary" size="large" onClick={() => navigate('/patient')}>
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <p className="body-large ac-appointment-request-page__loading">Loading appointment request options...</p>;
  }

  return (
    <div className="ac-appointment-request-page">
      <PageHeader
        eyebrow="APPOINTMENT REQUEST"
        title="Request an appointment"
        description="Tell the hospital when you would prefer to visit and what communication support you need. The hospital confirms the appointment."
      />

      <form onSubmit={submit} className="ac-appointment-request-page__form">
        <Card padding="large">
          <div className="ac-appointment-request-page__section">
            <h2 className="title-large">Appointment preferences</h2>
            <div className="ac-form-grid">
              <label className="ac-field">
                <span>Department</span>
                <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required>
                  <option value="">Select a department</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </label>
              <label className="ac-field">
                <span>Preferred date</span>
                <input type="date" value={preferredDate} onChange={(event) => setPreferredDate(event.target.value)} required />
              </label>
              <label className="ac-field">
                <span>Preferred time</span>
                <input type="time" value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)} />
              </label>
              <label className="ac-field">
                <span>Or preferred time window</span>
                <input type="text" value={timeWindow} onChange={(event) => setTimeWindow(event.target.value)} placeholder="e.g. Morning" />
              </label>
            </div>
            <p className="ac-field-help">Provide either a preferred time or a time window.</p>
          </div>
        </Card>

        <Card padding="large">
          <div className="ac-appointment-request-page__section">
            <h2 className="title-large">Accessibility requirements</h2>
            <div className="ac-form-grid">
              <label className="ac-field">
                <span>Preferred communication</span>
                <select value={communicationPreference} onChange={(event) => setCommunicationPreference(event.target.value as CommunicationPreference)} required>
                  <option value="">Select a communication preference</option>
                  {communicationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <fieldset className="ac-fieldset">
                <legend>Interpreter required?</legend>
                <div className="ac-choice-row">
                  <label><input type="radio" name="interpreter-required" checked={interpreterRequired === true} onChange={() => setInterpreterRequired(true)} /> Yes</label>
                  <label><input type="radio" name="interpreter-required" checked={interpreterRequired === false} onChange={() => setInterpreterRequired(false)} /> No</label>
                </div>
              </fieldset>

              {interpreterRequired && (
                <>
                  <label className="ac-field">
                    <span>Preferred interpreter mode</span>
                    <select value={preferredMode} onChange={(event) => setPreferredMode(event.target.value as InterpreterMode)} required>
                      <option value="">Select a preferred mode</option>
                      {modeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <fieldset className="ac-fieldset">
                    <legend>Remote support accepted?</legend>
                    <div className="ac-choice-row">
                      <label><input type="radio" name="remote-accepted" checked={remoteAccepted === true} onChange={() => setRemoteAccepted(true)} /> Yes</label>
                      <label><input type="radio" name="remote-accepted" checked={remoteAccepted === false} onChange={() => setRemoteAccepted(false)} /> No</label>
                    </div>
                  </fieldset>
                </>
              )}

              <fieldset className="ac-fieldset">
                <legend>Will a companion be present?</legend>
                <div className="ac-choice-row">
                  <label><input type="radio" name="companion-present" checked={companionPresent === true} onChange={() => setCompanionPresent(true)} /> Yes</label>
                  <label><input type="radio" name="companion-present" checked={companionPresent === false} onChange={() => setCompanionPresent(false)} /> No</label>
                </div>
              </fieldset>

              {companionPresent && (
                <fieldset className="ac-fieldset">
                  <legend>Should the companion assist with communication?</legend>
                  <div className="ac-choice-row">
                    <label><input type="radio" name="companion-assists" checked={companionAssists === true} onChange={() => setCompanionAssists(true)} /> Yes</label>
                    <label><input type="radio" name="companion-assists" checked={companionAssists === false} onChange={() => setCompanionAssists(false)} /> No</label>
                  </div>
                </fieldset>
              )}
            </div>
          </div>
        </Card>

        {error && <div className="ac-appointment-request-page__error" role="alert">{error}</div>}

        <div className="ac-appointment-request-page__actions">
          <Button type="button" variant="secondary" size="large" onClick={() => navigate('/patient')}>Cancel</Button>
          <Button type="submit" variant="primary" size="large" disabled={!canSubmit}>{isSubmitting ? 'Submitting...' : 'Submit Request'}</Button>
        </div>
      </form>
    </div>
  );
}
