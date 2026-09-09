import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Appointment } from '../../../types/patient';
import './NextStepCard.css';

export interface NextStepCardProps {
  appointment?: Appointment;
}

export const NextStepCard: React.FC<NextStepCardProps> = ({ appointment }) => {
  const navigate = useNavigate();

  const appointmentId = appointment?.id || 'A501';
  const doctor = appointment?.doctor_name || 'Dr. Sharma';
  const department = appointment?.department || 'ENT / Otolaryngology';
  const location = appointment?.location || 'Outpatient Block B, Room 204';
  const time = appointment?.appointment_time || 'Today, 10:30 AM';

  return (
    <section className="ac-next-step-card" aria-labelledby="next-step-heading">
      <div className="ac-next-step-card__header">
        <span id="next-step-heading" className="ac-next-step-card__eyebrow">
          YOUR NEXT STEP
        </span>
        <StatusBadge status="ready" label="Ready for Check-in" />
      </div>

      <div className="ac-next-step-card__body">
        <h2 className="ac-next-step-card__headline">
          Check in for your {time.split('–')[0]} appointment
        </h2>
        <p className="ac-next-step-card__context">
          <strong>{department}</strong> with <strong>{doctor}</strong>
          <br />
          {location}
        </p>
      </div>

      <div className="ac-next-step-card__actions">
        <Button
          variant="primary"
          size="large"
          onClick={() => navigate(`/patient/appointments/${appointmentId}`)}
        >
          Check In Now
        </Button>
        <Button
          variant="ghost"
          size="large"
          onClick={() => navigate(`/patient/appointments/${appointmentId}`)}
          style={{ color: 'var(--color-on-primary-container)' }}
        >
          View Appointment Details →
        </Button>
      </div>
    </section>
  );
};

export default NextStepCard;
