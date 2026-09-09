import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { InterpreterStatus } from '../../../types/patient';
import './InterpreterSummaryCard.css';

export interface InterpreterSummaryCardProps {
  interpreterStatus?: InterpreterStatus;
}

export const InterpreterSummaryCard: React.FC<InterpreterSummaryCardProps> = ({
  interpreterStatus,
}) => {
  const navigate = useNavigate();

  const name = interpreterStatus?.interpreter_name || 'Anitha Rajan';
  const qualification = interpreterStatus?.qualification_level || 'Certified ISL Medical Interpreter (Level 3)';
  const meetingPoint = interpreterStatus?.meeting_point || 'ENT Department Reception desk (Floor 2)';
  const eta = interpreterStatus?.eta || '10:15 AM (Arrived on site)';
  const contingency = interpreterStatus?.contingency_note || 'Remote VRI fallback active on tablet as backup.';

  return (
    <Card padding="large" className="ac-interp-summary">
      <div className="ac-interp-summary__header">
        <div>
          <span className="ac-interp-summary__eyebrow">INTERPRETER SUPPORT</span>
          <h3 className="ac-interp-summary__title">Confirmed Support Specialist</h3>
        </div>
        <StatusBadge status="confirmed" label="Interpreter Confirmed" />
      </div>

      <div className="ac-interp-summary__profile">
        <div className="ac-interp-summary__avatar" aria-hidden="true">
          🤟
        </div>
        <div className="ac-interp-summary__info">
          <h4 className="ac-interp-summary__name">{name}</h4>
          <span className="ac-interp-summary__qual">{qualification}</span>
        </div>
      </div>

      <div className="ac-interp-summary__details">
        <div className="ac-interp-summary__detail-item">
          <span className="ac-interp-summary__label">Meeting Point</span>
          <span className="ac-interp-summary__value">{meetingPoint}</span>
        </div>

        <div className="ac-interp-summary__detail-item">
          <span className="ac-interp-summary__label">Arrival Status</span>
          <span className="ac-interp-summary__value">{eta}</span>
        </div>
      </div>

      <div className="ac-interp-summary__contingency">
        <span className="ac-interp-summary__label">Backup & Contingency</span>
        <p className="ac-interp-summary__text">{contingency}</p>
      </div>

      <div className="ac-interp-summary__footer">
        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate('/patient/interpreter')}
        >
          View Full Interpreter Status
        </Button>
      </div>
    </Card>
  );
};

export default InterpreterSummaryCard;
