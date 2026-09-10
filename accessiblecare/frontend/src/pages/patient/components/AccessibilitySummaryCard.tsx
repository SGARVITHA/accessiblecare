import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { AccessibilityProfile } from '../../../types/patient';
import './AccessibilitySummaryCard.css';

export interface AccessibilitySummaryCardProps {
  profile?: AccessibilityProfile;
}

export const AccessibilitySummaryCard: React.FC<AccessibilitySummaryCardProps> = ({ profile }) => {
  const navigate = useNavigate();
  const configured = Boolean(profile?.id);

  return (
    <Card padding="large" className="ac-access-summary">
      <div className="ac-access-summary__header">
        <div>
          <span className="ac-access-summary__eyebrow">ACCESSIBILITY PROFILE</span>
          <h3 className="ac-access-summary__title">Your Communication Setup</h3>
        </div>
        <StatusBadge status={configured ? 'confirmed' : 'pending'} label={configured ? 'Setup Saved' : 'Not Configured'} />
      </div>

      {configured && profile ? (
        <div className="ac-access-summary__bento">
          <div className="ac-access-summary__item">
            <span className="ac-access-summary__label">Primary Preference</span>
            <span className="ac-access-summary__value">
              {profile.communication_preference === 'ISL' ? 'Indian Sign Language (ISL)' : profile.communication_preference}
            </span>
          </div>
          <div className="ac-access-summary__item">
            <span className="ac-access-summary__label">Interpreter Support</span>
            <span className="ac-access-summary__value">{profile.interpreter_required ? 'Required' : 'Not Required'}</span>
          </div>
          <div className="ac-access-summary__item">
            <span className="ac-access-summary__label">Remote Acceptance</span>
            <span className="ac-access-summary__value">{profile.allow_remote_fallback ? 'Accepted' : 'Not Accepted'}</span>
          </div>
          <div className="ac-access-summary__item">
            <span className="ac-access-summary__label">Companion Preference</span>
            <span className="ac-access-summary__value">{profile.companion_preference || (profile.companion_present ? 'Present' : 'Not Present')}</span>
          </div>
        </div>
      ) : (
        <div className="ac-access-summary__instructions">
          <span className="ac-access-summary__label">Current status</span>
          <p className="ac-access-summary__text">
            No saved accessibility profile is available yet. You can set your standing communication preferences here.
          </p>
        </div>
      )}

      <div className="ac-access-summary__footer">
        <Button variant="secondary" size="medium" onClick={() => navigate('/patient/accessibility')}>
          {configured ? 'Update Preferences' : 'Set Up Accessibility'}
        </Button>
      </div>
    </Card>
  );
};

export default AccessibilitySummaryCard;
