import React from 'react';
import { Card } from '../../../components/ui/Card';
import './TodayCareFlow.css';

export interface CareStep {
  id: number;
  label: string;
  sublabel: string;
  status: 'completed' | 'active' | 'upcoming';
  icon: string;
}

export const TodayCareFlow: React.FC = () => {
  const steps: CareStep[] = [
    {
      id: 1,
      label: '1. Patient Check-in',
      sublabel: 'In Progress • Please check in at reception or online',
      status: 'active',
      icon: '📍',
    },
    {
      id: 2,
      label: '2. Accessibility Support',
      sublabel: 'Confirmed • Anitha Rajan (ISL Interpreter on site)',
      status: 'upcoming',
      icon: '🤟',
    },
    {
      id: 3,
      label: '3. ENT Consultation',
      sublabel: 'Scheduled 10:30 AM • Dr. Sharma (Room 204)',
      status: 'upcoming',
      icon: '🩺',
    },
    {
      id: 4,
      label: '4. Follow-up & Care Summary',
      sublabel: 'Upcoming • Accessible visit record & prescription',
      status: 'upcoming',
      icon: '📋',
    },
  ];

  return (
    <Card padding="large" className="ac-care-flow">
      <div className="ac-care-flow__header">
        <h3 className="ac-care-flow__title">Today’s Care Journey</h3>
        <span className="ac-care-flow__badge">Step 1 of 4 Active</span>
      </div>

      <div className="ac-care-flow__timeline">
        {steps.map((step) => {
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';

          return (
            <div
              key={step.id}
              className={`ac-care-flow__step ${
                isActive ? 'ac-care-flow__step--active' : ''
              } ${isCompleted ? 'ac-care-flow__step--completed' : ''}`}
            >
              <div className="ac-care-flow__marker" aria-hidden="true">
                {step.icon}
              </div>

              <div className="ac-care-flow__content">
                <div className="ac-care-flow__step-title">
                  {step.label}
                  {isActive && (
                    <span className="ac-care-flow__current-label">
                      [Current Action]
                    </span>
                  )}
                </div>
                <div className="ac-care-flow__step-desc">{step.sublabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default TodayCareFlow;
