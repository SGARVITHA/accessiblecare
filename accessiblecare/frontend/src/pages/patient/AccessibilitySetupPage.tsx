import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { AccessibilityProfile, AccessibilityStatus, CommunicationPreference, InterpreterMode } from '../../types/patient';
import './AccessibilitySetupPage.css';

export const AccessibilitySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const appointmentId = (location.state as { appointmentId?: string } | null)?.appointmentId;

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

  const loadAppointmentStatus = async () => {
    if (!appointmentId) return null;
    const status = await patientService.getAccessibilityStatus(appointmentId);
    setAppointmentStatus(status);
    return status;
  };

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
          await loadAppointmentStatus();
        }
      } catch (err) {
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
          setAppointmentStatus(status);
        } catch (err) {
          const statusCode = err instanceof Error && 'status' in err ? (err as { status?: number }).status : undefined;
          if (statusCode !== 409) throw err;
          status = await patientService.getAccessibilityStatus(appointmentId);
          setAppointmentStatus(status);
        }
      }

      if (status.status === 'CREATED') {
        status = { ...status, visit: await patientService.confirmAccessibilityVisit(appointmentId) };
        setAppointmentStatus(status);
      } else if (status.status !== 'PREFERENCES_CONFIRMED') {
        throw new Error('This appointment accessibility setup is not in a confirmable state.');
      }

      setSavedSuccess(true);
      setTimeout(() => navigate(`/patient/appointments/${encodeURIComponent(appointmentId)}`), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save accessibility setup right now.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card padding="large">
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p style={{ color: 'var(--color-on-surface-variant)' }}>Loading accessibility preferences...</p>
        </div>
      </Card>
    );
  }

  const existingVisit = Boolean(appointmentId && appointmentStatus?.configured);
  const existingVisitConfirmed = appointmentStatus?.status === 'PREFERENCES_CONFIRMED';

  return (
    <div className="accessibility-setup-page">
      <PageHeader
        eyebrow="Patient Communication & Accommodations"
        title="Accessibility Setup"
        description="Tell us how we can make your hospital visit smooth, clear, and accessible."
      />

      {appointmentId && appointmentStatus && (
        <div className="save-success-banner" role="status">
          {appointmentStatus.configured
            ? `This appointment already has an accessibility visit (${appointmentStatus.status.replaceAll('_', ' ')}). No duplicate visit will be created.`
            : 'No appointment-specific accessibility visit is configured yet.'}
        </div>
      )}

      {error && (
        <div className="save-success-banner" role="alert" style={{ color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {savedSuccess && (
        <div className="save-success-banner" role="status">
          <span className="success-icon">✓</span>
          <span>{appointmentId ? 'Your accessibility setup is confirmed for this appointment.' : 'Your accessibility preferences have been updated.'}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="setup-form-container">
        <fieldset disabled={existingVisit} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
          <Card padding="large">
            <div className="wizard-step-header"><span className="step-number">Step 1</span><h2 className="step-title">Primary Communication Preference</h2></div>
            <p className="step-description">Select how you prefer to communicate with hospital doctors and clinical staff.</p>
            <fieldset className="option-grid">
              <legend className="sr-only">Communication Preference</legend>
              <label className={`option-card ${commPref === 'ISL' ? 'selected' : ''}`}><input type="radio" name="commPref" value="ISL" checked={commPref === 'ISL'} onChange={() => setCommPref('ISL')} /><div className="option-content"><span className="option-icon">🤟</span><strong>Indian Sign Language (ISL)</strong><span>Requires qualified ISL interpreter for clinical conversations.</span></div></label>
              <label className={`option-card ${commPref === 'TEXT' ? 'selected' : ''}`}><input type="radio" name="commPref" value="TEXT" checked={commPref === 'TEXT'} onChange={() => setCommPref('TEXT')} /><div className="option-content"><span className="option-icon">💬</span><span>Written Text & Chat</span><span>Prefer clear written text notes or live messaging on tablet.</span></div></label>
              <label className={`option-card ${commPref === 'SPEECH_TO_TEXT' ? 'selected' : ''}`}><input type="radio" name="commPref" value="SPEECH_TO_TEXT" checked={commPref === 'SPEECH_TO_TEXT'} onChange={() => setCommPref('SPEECH_TO_TEXT')} /><div className="option-content"><span className="option-icon">🎙️</span><span>Speech-to-Text Transcription</span><span>Live automated or assisted captions during doctor dialogue.</span></div></label>
              <label className={`option-card ${commPref === 'COMBINATION' ? 'selected' : ''}`}><input type="radio" name="commPref" value="COMBINATION" checked={commPref === 'COMBINATION'} onChange={() => setCommPref('COMBINATION')} /><div className="option-content"><span className="option-icon">🔄</span><span>Combination Support</span><span>Use ISL interpreter for clinical discussions + text for quick notes.</span></div></label>
            </fieldset>
          </Card>

          <Card padding="large">
            <div className="wizard-step-header"><span className="step-number">Step 2</span><h2 className="step-title">Interpreter Accommodations</h2></div>
            <div className="toggle-section">
              <div className="toggle-info"><strong>Require Sign Language Interpreter</strong><p>AccessibleCare records the requirement for future qualified human interpreter coordination.</p></div>
              <div className="toggle-buttons">
                <button type="button" className={`toggle-btn ${interpReq ? 'active' : ''}`} onClick={() => setInterpReq(true)}>Yes</button>
                <button type="button" className={`toggle-btn ${!interpReq ? 'active' : ''}`} onClick={() => setInterpReq(false)}>No</button>
              </div>
            </div>
            {interpReq && (
              <div className="sub-settings">
                <h3 className="sub-title">Preferred Interpreter Delivery Mode</h3>
                <fieldset className="option-grid mode-grid">
                  <legend className="sr-only">Preferred Interpreter Delivery Mode</legend>
                  <label className={`option-card ${interpMode === 'IN_PERSON' ? 'selected' : ''}`}><input type="radio" name="interpMode" value="IN_PERSON" checked={interpMode === 'IN_PERSON'} onChange={() => setInterpMode('IN_PERSON')} /><div className="option-content"><span className="option-icon">👤</span><strong>In-Person Interpreter</strong><span>Preferred delivery mode.</span></div></label>
                  <label className={`option-card ${interpMode === 'REMOTE' ? 'selected' : ''}`}><input type="radio" name="interpMode" value="REMOTE" checked={interpMode === 'REMOTE'} onChange={() => setInterpMode('REMOTE')} /><div className="option-content"><span className="option-icon">📱</span><span>Video Remote (VRI)</span><span>Preferred remote delivery mode.</span></div></label>
                  <label className={`option-card ${interpMode === 'EITHER' ? 'selected' : ''}`}><input type="radio" name="interpMode" value="EITHER" checked={interpMode === 'EITHER'} onChange={() => setInterpMode('EITHER')} /><div className="option-content"><span className="option-icon">✨</span><span>Either / First Available</span><span>Record either mode as acceptable.</span></div></label>
                </fieldset>
                <div className="checkbox-setting"><label className="checkbox-label"><input type="checkbox" checked={allowRemoteFallback} onChange={(e) => setAllowRemoteFallback(e.target.checked)} /><span><strong>Allow Remote Video Fallback</strong><br /><small style={{ color: 'var(--color-on-surface-variant)' }}>Records whether remote interpretation is acceptable; no automatic fallback is implemented in this phase.</small></span></label></div>
              </div>
            )}
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
          {existingVisit ? (
            <Button variant="primary" type="button" size="large" disabled={saving || existingVisitConfirmed} onClick={() => void handleSubmit({ preventDefault: () => undefined } as React.FormEvent)}>
              {existingVisitConfirmed ? 'Accessibility Setup Confirmed' : 'Confirm Existing Setup'}
            </Button>
          ) : (
            <Button variant="primary" type="submit" size="large" disabled={saving}>
              {saving ? 'Saving Settings...' : appointmentId ? 'Confirm Accessibility Setup' : 'Save & Update Setup'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AccessibilitySetupPage;
