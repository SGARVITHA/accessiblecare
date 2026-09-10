import React from 'react';
import { Card } from '../../../components/ui/Card';
import type { Appointment } from '../../../types/patient';
import './TodayCareFlow.css';

export interface TodayCareFlowProps {
  appointment?: Appointment;
}

export const TodayCareFlow: React.FC<TodayCareFlowProps> = ({ appointment }) => {
  const steps = appointment
    ? [
        {
          id: 1,
          label: '1. Appointment',
          sublabel: `${appointment.status.replaceAll('_', ' ')} • ${appointment.appointment_time}`,
          status: 'upcoming' as const,
          icon: '📅',
        },
        {
          id: 2,
          label: '2. Accessibility Setup',
          sublabel: 'Configure or review accessibility preferences for this appointment.',
          status: 'upcoming' as const,
          icon: '🤟',
        },
        {
          id: 3,
          label: '3. Interpreter Coordination',
          sublabel: 'Not yet available in this phase.',
          status: 'upcoming' as const,
          icon: '⏳',
        },
        {
          id: 4,
          label: '4. Clinical Visit',
          sublabel: 'Clinical workflow is outside the current AccessibleCare integration scope.',
          status: 'upcoming' as const,
          icon: '🩺',
        },
      ]
    : [
        {
          id: 1,
          label: '1. Appointment',
          sublabel: 'No appointment is currently available.',
          status: 'upcoming' as const,
          icon: '📅',
        },
        {
          id: 2,
          label: '2. Accessibility Setup',
          sublabel: 'Available for your standing accessibility preferences.',
          status: 'upcoming' as const,
          icon: '🤟',
        },
      ];

  return (
    <Card padding="large" className="ac-care-flow">
      <div className="ac-care-flow__header">
        <h3 className="ac-care-flow__title">Today’s Care Journey</h3>
        <span className="ac-care-flow__badge">Current capabilities</span>
      </div>

      <div className="ac-care-flow__timeline">
        {steps.map((step) => (
          <div key={step.id} className="ac-care-flow__step">
            <div className="ac-care-flow__marker" aria-hidden="true">{step.icon}</div>
            <div className="ac-care-flow__content">
              <div className="ac-care-flow__step-title">{step.label}</div>
              <div className="ac-care-flow__step-desc">{step.sublabel}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TodayCareFlow;
