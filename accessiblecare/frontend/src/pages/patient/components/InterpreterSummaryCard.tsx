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

export const InterpreterSummaryCard: React.FC<InterpreterSummaryCardProps> = ({ interpreterStatus }) => {
  const navigate = useNavigate();

  return (
    <Card padding="large" className="ac-interp-summary">
      <div className="ac-interp-summary__header">
        <div>
          <span className="ac-interp-summary__eyebrow">INTERPRETER SUPPORT</span>
          <h3 className="ac-interp-summary__title">Interpreter Coordination</h3>
        </div>
        <StatusBadge status={interpreterStatus ? 'confirmed' : 'pending'} label={interpreterStatus ? 'Status Available' : 'Not Available'} />
      </div>

      {interpreterStatus ? (
        <div className="ac-interp-summary__contingency">
          <span className="ac-interp-summary__label">Current support state</span>
          <p className="ac-interp-summary__text">
            {interpreterStatus.status.replaceAll('_', ' ')}. Interpreter coordination details are available only when a supported backend workflow provides them.
          </p>
        </div>
      ) : (
        <div className="ac-interp-summary__contingency">
          <span className="ac-interp-summary__label">Current product boundary</span>
          <p className="ac-interp-summary__text">
            Your accessibility request can be recorded, but interpreter coordination is not yet available in this phase.
          </p>
        </div>
      )}

      <div className="ac-interp-summary__footer">
        <Button variant="secondary" size="medium" onClick={() => navigate('/patient/interpreter')}>
          View Interpreter Status
        </Button>
      </div>
    </Card>
  );
};

export default InterpreterSummaryCard;
