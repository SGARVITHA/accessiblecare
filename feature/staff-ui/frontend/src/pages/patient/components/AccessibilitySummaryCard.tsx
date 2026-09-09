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

export const AccessibilitySummaryCard: React.FC<AccessibilitySummaryCardProps> = ({
  profile,
}) => {
  const navigate = useNavigate();

  const preference = profile?.communication_preference || 'ISL';
  const interpreterReq = profile?.interpreter_required ? 'Required (In-Person Preferred)' : 'Not Required';
  const remoteFallback = profile?.allow_remote_fallback ? 'Active (VRI Backup Enabled)' : 'Disabled';
  const instructions = profile?.special_instructions || 'Prefers clear visual alerts on room display and SMS notification.';

  return (
    <Card padding="large" className="ac-access-summary">
      <div className="ac-access-summary__header">
        <div>
          <span className="ac-access-summary__eyebrow">ACCESSIBILITY PROFILE</span>
          <h3 className="ac-access-summary__title">Your Communication Setup</h3>
        </div>
        <StatusBadge status="confirmed" label="Setup Verified" />
      </div>

      <div className="ac-access-summary__bento">
        <div className="ac-access-summary__item">
          <span className="ac-access-summary__label">Primary Preference</span>
          <span className="ac-access-summary__value">
            {preference === 'ISL' ? 'Indian Sign Language (ISL)' : preference}
          </span>
        </div>

        <div className="ac-access-summary__item">
          <span className="ac-access-summary__label">Interpreter Support</span>
          <span className="ac-access-summary__value">{interpreterReq}</span>
        </div>

        <div className="ac-access-summary__item">
          <span className="ac-access-summary__label">Remote VRI Fallback</span>
          <span className="ac-access-summary__value">{remoteFallback}</span>
        </div>

        <div className="ac-access-summary__item">
          <span className="ac-access-summary__label">Visual Assistance Alerts</span>
          <span className="ac-access-summary__value">Visual Reception & Queue Flash Active</span>
        </div>
      </div>

      <div className="ac-access-summary__instructions">
        <span className="ac-access-summary__label">Special Notes for Hospital Staff</span>
        <p className="ac-access-summary__text">{instructions}</p>
      </div>

      <div className="ac-access-summary__footer">
        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate('/patient/accessibility')}
        >
          Update Preferences
        </Button>
      </div>
    </Card>
  );
};

export default AccessibilitySummaryCard;
