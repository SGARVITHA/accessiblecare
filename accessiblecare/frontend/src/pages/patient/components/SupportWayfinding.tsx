import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import './SupportWayfinding.css';

export const SupportWayfinding: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card padding="large" className="ac-support-card">
      <div className="ac-support-card__header">
        <h3 className="ac-support-card__title">Hospital Accessibility Assistance</h3>
        <p className="ac-support-card__desc">Current patient-facing accessibility tools and their implementation status.</p>
      </div>

      <div className="ac-support-card__grid">
        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">📲</span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Visual Queue Alerts</h4>
            <p className="ac-support-card__tool-text">Alert preferences can be recorded, but live hospital queue notifications are not connected in this phase.</p>
          </div>
        </div>
        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">🗣️</span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Quick Communication</h4>
            <p className="ac-support-card__tool-text">Routine communication phrases are available in local/demo mode for non-clinical interactions.</p>
          </div>
        </div>
        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">🚶</span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Wayfinding & Escort</h4>
            <p className="ac-support-card__tool-text">Accessibility preferences can be recorded; live escort coordination is not connected in this phase.</p>
          </div>
        </div>
      </div>

      <div className="ac-support-card__footer">
        <Button variant="primary" size="medium" onClick={() => navigate('/patient/communication')}>Open Quick Communication Tool</Button>
      </div>
    </Card>
  );
};

export default SupportWayfinding;
