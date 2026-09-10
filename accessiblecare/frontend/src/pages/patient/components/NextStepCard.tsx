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

  if (!appointment) {
    return (
      <section className="ac-next-step-card" aria-labelledby="next-step-heading">
        <div className="ac-next-step-card__header">
          <span id="next-step-heading" className="ac-next-step-card__eyebrow">YOUR NEXT STEP</span>
          <StatusBadge status="pending" label="No Upcoming Appointment" />
        </div>
        <div className="ac-next-step-card__body">
          <h2 className="ac-next-step-card__headline">No upcoming appointment is available.</h2>
          <p className="ac-next-step-card__context">
            Your appointment information will appear here when it is available to AccessibleCare.
          </p>
        </div>
        <div className="ac-next-step-card__actions">
          <Button variant="secondary" size="large" onClick={() => navigate('/patient/appointments')}>
            View Appointments
          </Button>
        </div>
      </section>
    );
  }

  const appointmentId = appointment.id;
  const doctor = appointment.doctor_name || 'Your doctor';
  const department = appointment.department || 'Hospital Consultation';
  const location = appointment.location || appointment.hospital || 'Hospital location not provided';

  return (
    <section className="ac-next-step-card" aria-labelledby="next-step-heading">
      <div className="ac-next-step-card__header">
        <span id="next-step-heading" className="ac-next-step-card__eyebrow">YOUR NEXT STEP</span>
        <StatusBadge status="confirmed" label="Appointment Scheduled" />
      </div>

      <div className="ac-next-step-card__body">
        <h2 className="ac-next-step-card__headline">Review your scheduled appointment</h2>
        <p className="ac-next-step-card__context">
          <strong>{department}</strong> with <strong>{doctor}</strong>
          <br />
          {location} · {appointment.appointment_time}
        </p>
      </div>

      <div className="ac-next-step-card__actions">
        <Button
          variant="primary"
          size="large"
          onClick={() => navigate(`/patient/appointments/${encodeURIComponent(appointmentId)}`)}
        >
          View Appointment Details
        </Button>
      </div>
    </section>
  );
};

export default NextStepCard;
