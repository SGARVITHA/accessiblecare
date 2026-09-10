import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { AccessibilityProfile, AccessibilityStatus, CommunicationPreference, InterpreterMode } from '../../types/patient';
import './AccessibilitySetupPage.css';

export const AccessibilitySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const stateAppointmentId = (location.state as { appointmentId?: string } | null)?.appointmentId;
  const queryAppointmentId = new URLSearchParams(location.search).get('appointmentId');
  const appointmentId = queryAppointmentId || stateAppointmentId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appointmentStatus, setAppointmentStatus] = useState<AccessibilityStatus | null>(null);
  const [commPref, setCommPref] = useState<CommunicationPreference>('ISL');
  const [interpReq, setInterpReq] = useState(true);
  const [interpMode, setInterpMode] = useState<InterpreterMode>('IN_PERSON');
  const [allowRemoteFallback, setAllowRemoteFallback] = useState(true);
  const [companionPresent, setCompanionPresent] = useState(false);
  const [visualReceptionAlert, setVisualReceptionAlert] = useState(true);
  const [visualQueueAlert, setVisualQueueAlert] = useState(true);
  const [escortAssistance, setEscortAssistance] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const profile: AccessibilityProfile = await patientService.getAccessibilityProfile();
        setCommPref(profile.communication_preference);
        setInterpReq(profile.interpreter_required);
        setInterpMode(profile.interpreter_mode);
        setAllowRemoteFallback(profile.allow_remote_fallback);
        setCompanionPresent(profile.companion_present);
        setVisualReceptionAlert(profile.visual_reception_alert ?? true);
        setVisualQueueAlert(profile.visual_queue_alert ?? true);
        setEscortAssistance(profile.escort_assistance ?? false);
        setSpecialInstructions(profile.special_instructions || '');
        if (appointmentId) {
          const status = await patientService.getAccessibilityStatus(appointmentId);
          setAppointmentStatus(status);
        }
      } catch {
        setError('Unable to load your saved accessibility preferences right now.');
      } finally {
        setLoading(false);
      }
    }
    void fetchData();
  }, [appointmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setSaving(true);
      const profile = await patientService.updateAccessibilityProfile({
        communication_preference: commPref,
        interpreter_required: interpReq,
        interpreter_mode: interpMode,
        allow_remote_fallback: allowRemoteFallback,
        companion_present: companionPresent,
      });

      if (!appointmentId) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 4000);
        return;
      }

      let status = appointmentStatus || await patientService.getAccessibilityStatus(appointmentId);
      if (!status.configured) {
        try {
          await patientService.createAccessibilityVisit(appointmentId, {
            communication_preference: profile.communication_preference,
            interpreter_required: profile.interpreter_required,
            preferred_mode: profile.interpreter_mode,
            remote_accepted: profile.allow_remote_fallback,
            companion_present: profile.companion_present,
          });
          status = await patientService.getAccessibilityStatus(appointmentId);
        } catch (err) {
          const statusCode = err instanceof Error && 'status' in err ? (err as { status?: number }).status : undefined;
          if (statusCode !== 409) throw err;
          status = await patientService.getAccessibilityStatus(appointmentId);
        }
      }

      if (status.status === 'CREATED') {
        const visit = await patientService.confirmAccessibilityVisit(appointmentId);
        status = { ...status, configured: true, status: 'PREFERENCES_CONFIRMED', visit };
      } else if (status.status !== 'PREFERENCES_CONFIRMED') {
        throw new Error('This appointment accessibility setup is not in a confirmable state.');
      }

      setAppointmentStatus(status);
      setSavedSuccess(true);
      setTimeout(() => navigate(`/patient/appointments/${encodeURIComponent(appointmentId)}`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save accessibility setup right now.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Card padding="large"><div style={{ textAlign: 'center', padding: 'var(--space-8)' }}><p style={{ color: 'var(--color-on-surface-variant)' }}>Loading accessibility preferences...</p></div></Card>;
  }

  const existingVisit = Boolean(appointmentId && appointmentStatus?.configured);
  const existingVisitConfirmed = appointmentStatus?.status === 'PREFERENCES_CONFIRMED';

  return (
    <div className="accessibility-setup-page">
      <PageHeader eyebrow="Patient Communication & Accommodations" title="Accessibility Setup" description="Tell us how we can make your hospital visit smooth, clear, and accessible." />
      {appointmentId && appointmentStatus && <div className="save-success-banner" role="status">{appointmentStatus.configured ? `This appointment already has an accessibility visit (${appointmentStatus.status.replaceAll('_', ' ')}). No duplicate visit will be created.` : 'No appointment-specific accessibility visit is configured yet.'}</div>}
      {error && <div className="save-success-banner" role="alert" style={{ color: 'var(--color-error)' }}>{error}</div>}
      {savedSuccess && <div className="save-success-banner" role="status"><span className="success-icon">✓</span><span>{appointmentId ? 'Your accessibility setup is confirmed for this appointment.' : 'Your accessibility preferences have been updated.'}</span></div>}

      <form onSubmit={handleSubmit} className="setup-form-container">
        <fieldset disabled={existingVisit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Card padding="large">
            <div className="wizard-step-header"><span className="step-number">Step 1</span><h2 className="step-title">Primary Communication Preference</h2></div>
            <p className="step-description">Select how you prefer to communicate with hospital doctors and clinical staff.</p>
            <fieldset className="option-grid"><legend className="sr-only">Communication Preference</legend>
              {(['ISL', 'TEXT', 'SPEECH_TO_TEXT', 'COMBINATION'] as CommunicationPreference[]).map((value) => <label key={value} className={`option-card ${commPref === value ? 'selected' : ''}`}><input type="radio" name="commPref" value={value} checked={commPref === value} onChange={() => setCommPref(value)} /><div className="option-content"><span className="option-icon">{value === 'ISL' ? '🤟' : value === 'TEXT' ? '💬' : value === 'SPEECH_TO_TEXT' ? '🎙️' : '🔄'}</span><strong>{value === 'ISL' ? 'Indian Sign Language (ISL)' : value.replaceAll('_', ' ')}</strong><span>Saved as your communication preference.</span></div></label>)}
            </fieldset>
          </Card>

          <Card padding="large">
            <div className="wizard-step-header"><span className="step-number">Step 2</span><h2 className="step-title">Interpreter Accommodations</h2></div>
            <div className="toggle-section"><div className="toggle-info"><strong>Require Sign Language Interpreter</strong><p>AccessibleCare records the requirement for future qualified human interpreter coordination.</p></div><div className="toggle-buttons"><button type="button" className={`toggle-btn ${interpReq ? 'active' : ''}`} onClick={() => setInterpReq(true)}>Yes</button><button type="button" className={`toggle-btn ${!interpReq ? 'active' : ''}`} onClick={() => setInterpReq(false)}>No</button></div></div>
            {interpReq && <div className="sub-settings"><h3 className="sub-title">Preferred Interpreter Delivery Mode</h3><fieldset className="option-grid mode-grid"><legend className="sr-only">Preferred Interpreter Delivery Mode</legend>{(['IN_PERSON', 'REMOTE', 'EITHER'] as InterpreterMode[]).map((value) => <label key={value} className={`option-card ${interpMode === value ? 'selected' : ''}`}><input type="radio" name="interpMode" value={value} checked={interpMode === value} onChange={() => setInterpMode(value)} /><div className="option-content"><span className="option-icon">{value === 'IN_PERSON' ? '👤' : value === 'REMOTE' ? '📱' : '✨'}</span><span>{value === 'IN_PERSON' ? 'In-Person Interpreter' : value === 'REMOTE' ? 'Video Remote (VRI)' : 'Either / First Available'}</span><span>Saved preference only; coordination is not implemented here.</span></div></label>)}</fieldset><div className="checkbox-setting"><label className="checkbox-label"><input type="checkbox" checked={allowRemoteFallback} onChange={(e) => setAllowRemoteFallback(e.target.checked)} /><span><strong>Allow Remote Video Fallback</strong><br /><small style={{ color: 'var(--color-on-surface-variant)' }}>Records whether remote interpretation is acceptable; no automatic fallback is implemented in this phase.</small></span></label></div></div>}
          </Card>

          <Card padding="large">
            <div className="wizard-step-header"><span className="step-number">Step 3</span><h2 className="step-title">Hospital Visual & Queue Alerts</h2></div>
            <div className="checkbox-group">
              <label className="checkbox-card"><input type="checkbox" checked={visualReceptionAlert} onChange={(e) => setVisualReceptionAlert(e.target.checked)} /><div><strong>Visual Reception Alert</strong><p>Preference only; alert delivery is not connected in this phase.</p></div></label>
              <label className="checkbox-card"><input type="checkbox" checked={visualQueueAlert} onChange={(e) => setVisualQueueAlert(e.target.checked)} /><div><strong>Visual Waiting Queue Monitor</strong><p>Preference only; live queue data is not connected in this phase.</p></div></label>
              <label className="checkbox-card"><input type="checkbox" checked={escortAssistance} onChange={(e) => setEscortAssistance(e.target.checked)} /><div><strong>Hospital Wayfinding & Escort Assistance</strong><p>Preference only; escort coordination is not connected in this phase.</p></div></label>
              <label className="checkbox-card"><input type="checkbox" checked={companionPresent} onChange={(e) => setCompanionPresent(e.target.checked)} /><div><strong>Companion Present</strong><p>I will be accompanied by a family member or sign-literate companion.</p></div></label>
            </div>
            <div className="instructions-area"><label htmlFor="special-notes" className="instructions-label">Additional Communication Notes:</label><textarea id="special-notes" className="instructions-textarea" rows={3} placeholder="Add notes for future hospital accessibility workflows." value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} /></div>
          </Card>
        </fieldset>

        <div className="form-actions-bar">
          <Button variant="secondary" type="button" onClick={() => navigate(appointmentId ? `/patient/appointments/${encodeURIComponent(appointmentId)}` : '/patient')}>Cancel & Return</Button>
          {existingVisit ? <Button variant="primary" type="button" size="large" disabled={saving || existingVisitConfirmed} onClick={() => void handleSubmit({ preventDefault: () => undefined } as React.FormEvent)}>{existingVisitConfirmed ? 'Accessibility Setup Confirmed' : 'Confirm Existing Setup'}</Button> : <Button variant="primary" type="submit" size="large" disabled={saving}>{saving ? 'Saving Settings...' : appointmentId ? 'Confirm Accessibility Setup' : 'Save & Update Setup'}</Button>}
        </div>
      </form>
    </div>
  );
};

export default AccessibilitySetupPage;
