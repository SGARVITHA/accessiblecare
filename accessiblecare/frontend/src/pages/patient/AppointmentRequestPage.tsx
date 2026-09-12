import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { api } from '../../lib/api';
import patientService from '../../services/patientService';
import type { AppointmentRequestCreate, AppointmentRequestDepartment, CommunicationPreference, InterpreterMode } from '../../types/patient';
import './AppointmentRequestPage.css';

const communicationOptions: Array<{ value: CommunicationPreference; title: string; description: string; icon: string }> = [
  { value: 'ISL', title: 'Indian Sign Language', description: 'I prefer to communicate using ISL.', icon: 'ISL' },
  { value: 'TEXT', title: 'Text', description: 'I prefer written communication.', icon: 'Aa' },
  { value: 'SPEECH_TO_TEXT', title: 'Speech-to-text', description: 'I prefer spoken communication with text support.', icon: 'STT' },
  { value: 'COMBINATION', title: 'Combination', description: 'I am comfortable using more than one method.', icon: '＋' },
];

const modeOptions: Array<{ value: InterpreterMode; title: string; description: string }> = [
  { value: 'IN_PERSON', title: 'In-person', description: 'An interpreter physically present during my visit.' },
  { value: 'REMOTE', title: 'Remote', description: 'An interpreter joining remotely by video.' },
  { value: 'EITHER', title: 'Either works', description: 'In-person or remote support is okay.' },
];

export default function AppointmentRequestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<AppointmentRequestDepartment[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');
  const [communicationPreference, setCommunicationPreference] = useState<CommunicationPreference | ''>('');
  const [interpreterRequired, setInterpreterRequired] = useState<boolean | null>(null);
  const [preferredMode, setPreferredMode] = useState<InterpreterMode | ''>('');
  const [remoteAccepted, setRemoteAccepted] = useState<boolean | null>(null);
  const [companionPresent, setCompanionPresent] = useState<boolean | null>(null);
  const [companionAssists, setCompanionAssists] = useState<boolean | null>(null);
  const [accessibilityNote, setAccessibilityNote] = useState('');
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      patientService.getAppointmentRequestDepartments(),
      api.getAuthMe(),
    ])
      .then(([rows, profile]) => {
        setDepartments(rows);
        setPatientName(profile.full_name?.trim() || '');
        setPatientPhone(profile.phone?.trim() || '');
      })
      .catch(() => setError('We couldn’t load your visit details right now.'))
      .finally(() => { setIsLoading(false); setProfileLoading(false); });
  }, []);

  const profileValid = Boolean(patientName.trim() && patientPhone.trim());
  const stepOneValid = Boolean(departmentId && reasonForVisit.trim() && profileValid);
  const stepTwoValid = Boolean(communicationPreference);
  const stepThreeValid = interpreterRequired !== null && (!interpreterRequired || (preferredMode && remoteAccepted !== null));
  const stepFourValid = companionPresent !== null && (!companionPresent || companionAssists !== null);

  const selectedDepartment = departments.find((department) => department.id === departmentId)?.name || 'Not selected';
  const communicationLabel = communicationOptions.find((option) => option.value === communicationPreference)?.title || 'Not selected';
  const modeLabel = modeOptions.find((option) => option.value === preferredMode)?.title || 'Not required';

  const canSubmit = useMemo(() =>
    stepOneValid && stepTwoValid && stepThreeValid && stepFourValid && !isSubmitting,
    [stepOneValid, stepTwoValid, stepThreeValid, stepFourValid, isSubmitting],
  );

  const saveProfile = async () => {
    const name = patientName.trim();
    const phone = patientPhone.trim();
    if (!name || !phone) { setError('Please enter your name and phone number.'); return false; }
    setError(null);
    setProfileSaving(true);
    try {
      const updated = await api.updateMyProfile({ full_name: name, phone });
      setPatientName(updated.full_name?.trim() || name);
      setPatientPhone(updated.phone?.trim() || phone);
      return true;
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'We couldn’t save your details right now.');
      return false;
    } finally { setProfileSaving(false); }
  };

  const goNext = async () => {
    setError(null);
    if (step === 1) {
      if (!departmentId || !reasonForVisit.trim()) { setError('Please select a department and tell us the reason for your visit.'); return; }
      if (!profileValid) { await saveProfile(); if (!patientName.trim() || !patientPhone.trim()) return; }
    }
    if (step === 2 && !stepTwoValid) { setError('Please choose how you prefer to communicate.'); return; }
    if (step === 3 && !stepThreeValid) { setError('Please complete the interpreter preferences.'); return; }
    if (step === 4 && !stepFourValid) { setError('Please complete the companion preferences.'); return; }
    setStep((current) => Math.min(5, current + 1));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !communicationPreference || interpreterRequired === null || companionPresent === null) return;
    setError(null);
    setIsSubmitting(true);
    const profileSaved = await saveProfile();
    if (!profileSaved) { setIsSubmitting(false); return; }
    const payload: AppointmentRequestCreate = {
      department_id: departmentId,
      reason_for_visit: reasonForVisit.trim(),
      communication_preference: communicationPreference,
      interpreter_required: interpreterRequired,
      preferred_interpreter_mode: interpreterRequired ? (preferredMode || null) : null,
      remote_accepted: interpreterRequired ? remoteAccepted === true : false,
      companion_present: companionPresent,
      companion_assists_communication: companionPresent ? companionAssists === true : false,
      accessibility_note: accessibilityNote.trim() || null,
    };
    try {
      await patientService.createAppointmentRequest(payload);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'We couldn’t send your request right now.');
    } finally { setIsSubmitting(false); }
  };

  if (submitted) {
    return (
      <div className="ac-appointment-request-page">
        <Card padding="large" className="ac-appointment-request-page__success">
          <div className="ac-status-icon" aria-hidden="true">✓</div>
          <span className="ac-appointment-request-page__eyebrow">REQUEST SENT</span>
          <h1 className="headline-medium">Your request has been sent to the hospital.</h1>
          <p className="body-large">Your accessibility requirements have been included. Hospital staff will review your request and confirm the actual appointment details.</p>
          <div className="ac-pending-banner"><strong>PENDING HOSPITAL CONFIRMATION</strong><span>Your appointment date, time and doctor will appear here after the hospital confirms your visit.</span></div>
          <div className="ac-appointment-request-page__actions">
            <Button variant="primary" size="large" onClick={() => navigate('/patient/appointment-requests')}>View My Requests</Button>
            <Button variant="secondary" size="large" onClick={() => navigate('/patient')}>Back to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (isLoading || profileLoading) return <p className="body-large ac-appointment-request-page__loading">Preparing your visit request...</p>;

  return (
    <div className="ac-appointment-request-page">
      <PageHeader eyebrow="ACCESSIBLE VISIT REQUEST" title="Let’s make your visit accessible" description="Tell us what you need at the hospital. We’ll share these requirements with the staff handling your visit." />
      <div className="ac-request-progress" aria-label={`Step ${step} of 5`}>
        {[1, 2, 3, 4, 5].map((item) => <div key={item} className={`ac-request-progress__item ${item <= step ? 'is-active' : ''}`}><span>{item}</span><small>{['Visit', 'Communication', 'Interpreter', 'Companion', 'Review'][item - 1]}</small></div>)}
      </div>
      <form onSubmit={submit} className="ac-appointment-request-page__form">
        {step === 1 && (
          <Card padding="large"><div className="ac-appointment-request-page__section">
            <span className="ac-section-kicker">STEP 1 OF 5</span>
            <h2 className="title-large">Tell us about your visit</h2>
            <p className="body-medium ac-section-intro">You’re requesting support after arriving at the hospital. The hospital team will decide and enter the appointment time.</p>
            <div className="ac-profile-summary">
              <div><span>Your details</span><strong>{patientName || 'Not provided'}</strong><small>{patientPhone || 'Phone number needed'}</small></div>
              <span className="ac-profile-summary__status">{profileValid ? 'Saved to your profile' : 'Details needed'}</span>
            </div>
            {!profileValid && <div className="ac-profile-edit">
              <p className="body-medium">We need your name and phone number to send this request. These details will be saved to your AccessibleCare profile.</p>
              <label className="ac-field"><span>Your name</span><input value={patientName} onChange={(event) => setPatientName(event.target.value)} placeholder="Enter your full name" autoComplete="name" /></label>
              <label className="ac-field"><span>Phone number</span><input value={patientPhone} onChange={(event) => setPatientPhone(event.target.value)} placeholder="Enter your phone number" type="tel" autoComplete="tel" /></label>
              <Button type="button" variant="secondary" onClick={saveProfile} disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Save my details'}</Button>
            </div>}
            <label className="ac-field"><span>Which department do you need to visit?</span><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} required><option value="">Select a department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <label className="ac-field"><span>What is the reason for your visit?</span><textarea value={reasonForVisit} onChange={(event) => setReasonForVisit(event.target.value)} placeholder="For example, I need to see a doctor about..." rows={4} required /><small>This helps hospital staff understand which service you need. You do not need to provide medical history here.</small></label>
          </div></Card>
        )}
        {step === 2 && (
          <Card padding="large"><div className="ac-appointment-request-page__section"><span className="ac-section-kicker">STEP 2 OF 5</span><h2 className="title-large">How do you prefer to communicate?</h2><p className="body-medium ac-section-intro">Choose the option that works best for you. You can tell us more about interpreter support next.</p><div className="ac-option-grid">{communicationOptions.map((option) => <button type="button" key={option.value} className={`ac-option-card ${communicationPreference === option.value ? 'is-selected' : ''}`} onClick={() => setCommunicationPreference(option.value)} aria-pressed={communicationPreference === option.value}><span className="ac-option-card__icon" aria-hidden="true">{option.icon}</span><span className="ac-option-card__content"><strong>{option.title}</strong><small>{option.description}</small></span><span className="ac-option-card__check" aria-hidden="true">{communicationPreference === option.value ? '✓' : ''}</span></button>)}</div></div></Card>
        )}
        {step === 3 && (
          <Card padding="large"><div className="ac-appointment-request-page__section"><span className="ac-section-kicker">STEP 3 OF 5</span><h2 className="title-large">Would you like interpreter support?</h2><p className="body-medium ac-section-intro">We’ll use this preference to help hospital staff arrange the right communication support.</p><div className="ac-choice-cards ac-choice-cards--two">{([true, false] as const).map((value) => <button type="button" key={String(value)} className={`ac-choice-card ${interpreterRequired === value ? 'is-selected' : ''}`} onClick={() => { setInterpreterRequired(value); if (!value) { setPreferredMode(''); setRemoteAccepted(null); } }} aria-pressed={interpreterRequired === value}><strong>{value ? 'Yes, I need an interpreter' : 'No, I do not need one'}</strong><small>{value ? 'Continue to tell us what type of support works best.' : 'I can communicate using my selected preference.'}</small></button>)}</div>{interpreterRequired && <div className="ac-conditional-section"><h3 className="title-medium">What works best for you?</h3><div className="ac-option-grid ac-option-grid--compact">{modeOptions.map((option) => <button type="button" key={option.value} className={`ac-option-card ${preferredMode === option.value ? 'is-selected' : ''}`} onClick={() => setPreferredMode(option.value)} aria-pressed={preferredMode === option.value}><span className="ac-option-card__content"><strong>{option.title}</strong><small>{option.description}</small></span><span className="ac-option-card__check" aria-hidden="true">{preferredMode === option.value ? '✓' : ''}</span></button>)}</div><fieldset className="ac-fieldset"><legend>If in-person support is not available, is remote support okay?</legend><div className="ac-choice-cards ac-choice-cards--two">{([true, false] as const).map((value) => <button type="button" key={String(value)} className={`ac-choice-card ${remoteAccepted === value ? 'is-selected' : ''}`} onClick={() => setRemoteAccepted(value)} aria-pressed={remoteAccepted === value}><strong>{value ? 'Yes, remote is okay' : 'No, I need in-person support'}</strong></button>)}</div></fieldset></div>}</div></Card>
        )}
        {step === 4 && (
          <Card padding="large"><div className="ac-appointment-request-page__section"><span className="ac-section-kicker">STEP 4 OF 5</span><h2 className="title-large">Will someone accompany you?</h2><p className="body-medium ac-section-intro">This helps staff understand how communication support should be arranged.</p><div className="ac-choice-cards ac-choice-cards--two">{([true, false] as const).map((value) => <button type="button" key={String(value)} className={`ac-choice-card ${companionPresent === value ? 'is-selected' : ''}`} onClick={() => { setCompanionPresent(value); if (!value) setCompanionAssists(null); }} aria-pressed={companionPresent === value}><strong>{value ? 'Yes, someone will accompany me' : 'No, I’ll be coming alone'}</strong></button>)}</div>{companionPresent && <fieldset className="ac-fieldset ac-conditional-section"><legend>Would you like your companion to help with communication?</legend><div className="ac-choice-cards ac-choice-cards--two">{([true, false] as const).map((value) => <button type="button" key={String(value)} className={`ac-choice-card ${companionAssists === value ? 'is-selected' : ''}`} onClick={() => setCompanionAssists(value)} aria-pressed={companionAssists === value}><strong>{value ? 'Yes, they can assist' : 'No, I prefer other support'}</strong></button>)}</div></fieldset>}{/* accessibility note */}<label className="ac-field ac-conditional-section"><span>Anything else you’d like the hospital staff to know? <em>Optional</em></span><textarea value={accessibilityNote} onChange={(event) => setAccessibilityNote(event.target.value)} placeholder="For example, please communicate with me directly and use visual alerts when calling me." rows={4} maxLength={500} /><small>{accessibilityNote.length}/500</small></label></div></Card>
        )}
        {step === 5 && (
          <Card padding="large"><div className="ac-appointment-request-page__section"><span className="ac-section-kicker">STEP 5 OF 5</span><h2 className="title-large">Review your request</h2><p className="body-medium ac-section-intro">Please check the details before sending them to the hospital.</p><div className="ac-review-list"><div><span>Name</span><strong>{patientName || '—'}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div><div><span>Phone</span><strong>{patientPhone || '—'}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div><div><span>Department</span><strong>{selectedDepartment}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div><div><span>Reason for visit</span><strong>{reasonForVisit || '—'}</strong><button type="button" onClick={() => setStep(1)}>Edit</button></div><div><span>Communication</span><strong>{communicationLabel}</strong><button type="button" onClick={() => setStep(2)}>Edit</button></div><div><span>Interpreter</span><strong>{interpreterRequired ? `Yes · ${modeLabel} · ${remoteAccepted ? 'remote fallback accepted' : 'in-person only'}` : 'No'}</strong><button type="button" onClick={() => setStep(3)}>Edit</button></div><div><span>Companion</span><strong>{companionPresent ? `Yes · ${companionAssists ? 'assists with communication' : 'does not assist'}` : 'No'}</strong><button type="button" onClick={() => setStep(4)}>Edit</button></div><div><span>Accessibility note</span><strong>{accessibilityNote || 'None added'}</strong><button type="button" onClick={() => setStep(4)}>Edit</button></div></div></div></Card>
        )}
        {error && <div className="ac-request-error" role="alert">{error}</div>}
        <div className="ac-appointment-request-page__navigation">{step > 1 && <Button type="button" variant="secondary" onClick={() => { setError(null); setStep((current) => current - 1); }}>Back</Button>}{step < 5 ? <Button type="button" variant="primary" onClick={goNext} disabled={profileSaving}>{profileSaving ? 'Saving...' : 'Continue'}</Button> : <Button type="submit" variant="primary" size="large" disabled={!canSubmit || profileSaving}>{isSubmitting || profileSaving ? 'Sending request...' : 'Send request to hospital'}</Button>}</div>
      </form>
    </div>
  );
}
