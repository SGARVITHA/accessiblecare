import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { AccessibilityProfile, CommunicationPreference, InterpreterMode } from '../../types/patient';
import './AccessibilitySetupPage.css';

export const AccessibilitySetupPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Form State
  const [commPref, setCommPref] = useState<CommunicationPreference>('ISL');
  const [interpReq, setInterpReq] = useState<boolean>(true);
  const [interpMode, setInterpMode] = useState<InterpreterMode>('IN_PERSON');
  const [allowRemoteFallback, setAllowRemoteFallback] = useState<boolean>(true);
  const [companionPresent, setCompanionPresent] = useState<boolean>(false);
  const [visualReceptionAlert, setVisualReceptionAlert] = useState<boolean>(true);
  const [visualQueueAlert, setVisualQueueAlert] = useState<boolean>(true);
  const [escortAssistance, setEscortAssistance] = useState<boolean>(false);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const profile: AccessibilityProfile = await patientService.getAccessibilityProfile();
        setCommPref(profile.communication_preference);
        setInterpReq(profile.interpreter_required);
        setInterpMode(profile.interpreter_mode);
        setAllowRemoteFallback(profile.allow_remote_fallback);
        setCompanionPresent(profile.companion_present);
        setVisualReceptionAlert(profile.visual_reception_alert);
        setVisualQueueAlert(profile.visual_queue_alert);
        setEscortAssistance(profile.escort_assistance);
        setSpecialInstructions(profile.special_instructions || '');
      } catch (err) {
        console.error('Failed to load accessibility profile:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await patientService.updateAccessibilityProfile({
        communication_preference: commPref,
        interpreter_required: interpReq,
        interpreter_mode: interpMode,
        allow_remote_fallback: allowRemoteFallback,
        companion_present: companionPresent,
        visual_reception_alert: visualReceptionAlert,
        visual_queue_alert: visualQueueAlert,
        escort_assistance: escortAssistance,
        special_instructions: specialInstructions,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update accessibility profile:', err);
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

  return (
    <div className="accessibility-setup-page">
      <PageHeader
        eyebrow="Patient Communication & Accommodations"
        title="Accessibility Setup"
        description="Tell us how we can make your hospital visit smooth, clear, and accessible."
      />

      {savedSuccess && (
        <div className="save-success-banner" role="alert">
          <span className="success-icon">✓</span>
          <span>Your accessibility preferences have been updated for your visit!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="setup-form-container">
        {/* Step 1 / Communication Preference */}
        <Card padding="large">
          <div className="wizard-step-header">
            <span className="step-number">Step 1</span>
            <h2 className="step-title">Primary Communication Preference</h2>
          </div>
          <p className="step-description">
            Select how you prefer to communicate with hospital doctors and clinical staff.
          </p>

          <fieldset className="option-grid">
            <legend className="sr-only">Communication Preference</legend>
            <label className={`option-card ${commPref === 'ISL' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="commPref"
                value="ISL"
                checked={commPref === 'ISL'}
                onChange={() => setCommPref('ISL')}
              />
              <div className="option-content">
                <span className="option-icon">🤟</span>
                <strong>Indian Sign Language (ISL)</strong>
                <span>Requires qualified ISL interpreter for clinical conversations.</span>
              </div>
            </label>

            <label className={`option-card ${commPref === 'TEXT' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="commPref"
                value="TEXT"
                checked={commPref === 'TEXT'}
                onChange={() => setCommPref('TEXT')}
              />
              <div className="option-content">
                <span className="option-icon">💬</span>
                <span>Written Text & Chat</span>
                <span>Prefer clear written text notes or live messaging on tablet.</span>
              </div>
            </label>

            <label className={`option-card ${commPref === 'SPEECH_TO_TEXT' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="commPref"
                value="SPEECH_TO_TEXT"
                checked={commPref === 'SPEECH_TO_TEXT'}
                onChange={() => setCommPref('SPEECH_TO_TEXT')}
              />
              <div className="option-content">
                <span className="option-icon">🎙️</span>
                <span>Speech-to-Text Transcription</span>
                <span>Live automated or assisted captions during doctor dialogue.</span>
              </div>
            </label>

            <label className={`option-card ${commPref === 'COMBINATION' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="commPref"
                value="COMBINATION"
                checked={commPref === 'COMBINATION'}
                onChange={() => setCommPref('COMBINATION')}
              />
              <div className="option-content">
                <span className="option-icon">🔄</span>
                <span>Combination Support</span>
                <span>Use ISL interpreter for clinical discussions + text for quick notes.</span>
              </div>
            </label>
          </fieldset>
        </Card>

        {/* Step 2 / Interpreter Requirement & Mode */}
        <Card padding="large">
          <div className="wizard-step-header">
            <span className="step-number">Step 2</span>
            <h2 className="step-title">Interpreter Accommodations</h2>
          </div>
          
          <div className="toggle-section">
            <div className="toggle-info">
              <strong>Require Sign Language Interpreter</strong>
              <p>AccessibleCare coordinates certified human interpreters for high-risk clinical communication.</p>
            </div>
            <div className="toggle-buttons">
              <button
                type="button"
                className={`toggle-btn ${interpReq ? 'active' : ''}`}
                onClick={() => setInterpReq(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`toggle-btn ${!interpReq ? 'active' : ''}`}
                onClick={() => setInterpReq(false)}
              >
                No
              </button>
            </div>
          </div>

          {interpReq && (
            <div className="sub-settings">
              <h3 className="sub-title">Preferred Interpreter Delivery Mode</h3>
              <fieldset className="option-grid mode-grid">
                <legend className="sr-only">Preferred Interpreter Delivery Mode</legend>
                <label className={`option-card ${interpMode === 'IN_PERSON' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="interpMode"
                    value="IN_PERSON"
                    checked={interpMode === 'IN_PERSON'}
                    onChange={() => setInterpMode('IN_PERSON')}
                  />
                  <div className="option-content">
                    <span className="option-icon">👤</span>
                    <strong>In-Person Interpreter</strong>
                    <span>Interpreter present on site in consultation room.</span>
                  </div>
                </label>

                <label className={`option-card ${interpMode === 'REMOTE' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="interpMode"
                    value="REMOTE"
                    checked={interpMode === 'REMOTE'}
                    onChange={() => setInterpMode('REMOTE')}
                  />
                  <div className="option-content">
                    <span className="option-icon">📱</span>
                    <span>Video Remote (VRI)</span>
                    <span>Live interpreter via secure medical video tablet.</span>
                  </div>
                </label>

                <label className={`option-card ${interpMode === 'EITHER' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="interpMode"
                    value="EITHER"
                    checked={interpMode === 'EITHER'}
                    onChange={() => setInterpMode('EITHER')}
                  />
                  <div className="option-content">
                    <span className="option-icon">✨</span>
                    <span>Either / First Available</span>
                    <span>Accept whichever qualified mode is available fastest.</span>
                  </div>
                </label>
              </fieldset>

              <div className="checkbox-setting">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={allowRemoteFallback}
                    onChange={(e) => setAllowRemoteFallback(e.target.checked)}
                  />
                  <span>
                    <strong>Allow Remote Video Fallback</strong>
                    <br />
                    <small style={{ color: 'var(--color-on-surface-variant)' }}>
                      If an in-person interpreter is delayed, switch automatically to secure Video Remote (VRI) to prevent appointment delay.
                    </small>
                  </span>
                </label>
              </div>
            </div>
          )}
        </Card>

        {/* Step 3 / Additional Hospital Visual & Physical Assistance */}
        <Card padding="large">
          <div className="wizard-step-header">
            <span className="step-number">Step 3</span>
            <h2 className="step-title">Hospital Visual & Queue Alerts</h2>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={visualReceptionAlert}
                onChange={(e) => setVisualReceptionAlert(e.target.checked)}
              />
              <div>
                <strong>Visual Reception Alert</strong>
                <p>Flash screen display and send SMS/vibration alert when your turn is called.</p>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={visualQueueAlert}
                onChange={(e) => setVisualQueueAlert(e.target.checked)}
              />
              <div>
                <strong>Visual Waiting Queue Monitor</strong>
                <p>Display real-time queue position on hospital waiting room screens.</p>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={escortAssistance}
                onChange={(e) => setEscortAssistance(e.target.checked)}
              />
              <div>
                <strong>Hospital Wayfinding & Escort Assistance</strong>
                <p>Request visual escort staff to guide you between reception, labs, and doctor's room.</p>
              </div>
            </label>

            <label className="checkbox-card">
              <input
                type="checkbox"
                checked={companionPresent}
                onChange={(e) => setCompanionPresent(e.target.checked)}
              />
              <div>
                <strong>Companion Present</strong>
                <p>I will be accompanied by a family member or sign-literate companion.</p>
              </div>
            </label>
          </div>

          <div className="instructions-area">
            <label htmlFor="special-notes" className="instructions-label">
              Additional Communication Notes for Hospital Desk:
            </label>
            <textarea
              id="special-notes"
              className="instructions-textarea"
              rows={3}
              placeholder="e.g. Please tap gently on desk or send SMS when calling my name. Prefers front row waiting area."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
        </Card>

        {/* Form Action Controls */}
        <div className="form-actions-bar">
          <Button variant="secondary" type="button" onClick={() => navigate('/patient')}>
            Cancel & Return
          </Button>
          <Button variant="primary" type="submit" size="large" disabled={saving}>
            {saving ? 'Saving Settings...' : 'Save & Update Setup'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AccessibilitySetupPage;
