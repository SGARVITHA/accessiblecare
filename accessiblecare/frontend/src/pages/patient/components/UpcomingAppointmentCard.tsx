import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Appointment, InterpreterStatus } from '../../../types/patient';
import './UpcomingAppointmentCard.css';

export interface UpcomingAppointmentCardProps {
  appointment?: Appointment;
  interpreterStatus?: InterpreterStatus;
}

export const UpcomingAppointmentCard: React.FC<UpcomingAppointmentCardProps> = ({
  appointment,
  interpreterStatus,
}) => {
  const navigate = useNavigate();

  const appointmentId = appointment?.id || 'A501';
  const doctor = appointment?.doctor_name || 'Dr. Sharma';
  const department = appointment?.department || 'ENT / Otolaryngology';
  const location = appointment?.location || 'Outpatient Block B, Room 204';
  const time = appointment?.appointment_time || 'Today, 10:30 AM – 11:00 AM';
  const notes = appointment?.notes || 'Routine audiogram and ENT follow-up consultation.';
  const interpreterName = interpreterStatus?.interpreter_name || 'Anitha Rajan';

  return (
    <Card padding="large" className="ac-upcoming-card">
      <div className="ac-upcoming-card__header">
        <div>
          <span className="ac-upcoming-card__eyebrow">UPCOMING APPOINTMENT</span>
          <h3 className="ac-upcoming-card__title">{department}</h3>
        </div>
        <StatusBadge status="confirmed" label="Appointment Confirmed" />
      </div>

      <div className="ac-upcoming-card__grid">
        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Physician</span>
          <span className="ac-upcoming-card__value">{doctor}</span>
        </div>

        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Date & Time</span>
          <span className="ac-upcoming-card__value">{time}</span>
        </div>

        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Hospital Location</span>
          <span className="ac-upcoming-card__value">{location}</span>
        </div>

        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Assigned Interpreter</span>
          <span className="ac-upcoming-card__value">
            {interpreterName} (ISL In-Person)
          </span>
        </div>
      </div>

      <div className="ac-upcoming-card__notes">
        <span className="ac-upcoming-card__label">Appointment Notes</span>
        <p className="ac-upcoming-card__notes-text">{notes}</p>
      </div>

      <div className="ac-upcoming-card__footer">
        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate(`/patient/appointments/${appointmentId}`)}
        >
          View Full Details
        </Button>
        <Button
          variant="ghost"
          size="medium"
          onClick={() => navigate('/patient/communication')}
        >
          Quick Communication →
        </Button>
      </div>
    </Card>
  );
};

export default UpcomingAppointmentCard;
