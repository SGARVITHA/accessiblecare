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
        <p className="ac-support-card__desc">
          On-site visual tools and support services for your hospital visit.
        </p>
      </div>

      <div className="ac-support-card__grid">
        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">
            📲
          </span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Visual Queue Alert</h4>
            <p className="ac-support-card__tool-text">
              Screen flashes & SMS notification sent when your turn arrives.
            </p>
          </div>
        </div>

        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">
            🗣️
          </span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Quick Communication</h4>
            <p className="ac-support-card__tool-text">
              Tap rapid phrases ("I have arrived", "Need help finding room") for desk staff.
            </p>
          </div>
        </div>

        <div className="ac-support-card__tool">
          <span className="ac-support-card__icon" aria-hidden="true">
            🚶
          </span>
          <div className="ac-support-card__tool-content">
            <h4 className="ac-support-card__tool-title">Escort & Navigation</h4>
            <p className="ac-support-card__tool-text">
              Request visual wayfinding guidance to ENT Room 204.
            </p>
          </div>
        </div>
      </div>

      <div className="ac-support-card__footer">
        <Button
          variant="primary"
          size="medium"
          onClick={() => navigate('/patient/communication')}
        >
          Open Quick Communication Tool
        </Button>
      </div>
    </Card>
  );
};

export default SupportWayfinding;
