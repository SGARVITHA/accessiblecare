import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Appointment } from '../../../types/patient';
import './UpcomingAppointmentCard.css';

export interface UpcomingAppointmentCardProps {
  appointment?: Appointment;
}

export const UpcomingAppointmentCard: React.FC<UpcomingAppointmentCardProps> = ({ appointment }) => {
  const navigate = useNavigate();

  if (!appointment) {
    return (
      <Card padding="large" className="ac-upcoming-card">
        <div className="ac-upcoming-card__header">
          <div>
            <span className="ac-upcoming-card__eyebrow">UPCOMING APPOINTMENT</span>
            <h3 className="ac-upcoming-card__title">No upcoming appointment</h3>
          </div>
          <StatusBadge status="pending" label="None Scheduled" />
        </div>
        <p className="ac-upcoming-card__notes-text">
          No appointment is currently available in your AccessibleCare record.
        </p>
        <div className="ac-upcoming-card__footer">
          <Button variant="secondary" size="medium" onClick={() => navigate('/patient/appointments')}>
            View Appointments
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="large" className="ac-upcoming-card">
      <div className="ac-upcoming-card__header">
        <div>
          <span className="ac-upcoming-card__eyebrow">UPCOMING APPOINTMENT</span>
          <h3 className="ac-upcoming-card__title">{appointment.department || 'Hospital Consultation'}</h3>
        </div>
        <StatusBadge
          status={appointment.status === 'CANCELLED' ? 'cancelled' : 'confirmed'}
          label={appointment.status.replaceAll('_', ' ')}
        />
      </div>

      <div className="ac-upcoming-card__grid">
        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Physician</span>
          <span className="ac-upcoming-card__value">{appointment.doctor_name || '—'}</span>
        </div>
        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Date & Time</span>
          <span className="ac-upcoming-card__value">{appointment.appointment_time}</span>
        </div>
        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Hospital Location</span>
          <span className="ac-upcoming-card__value">{appointment.location || appointment.hospital || '—'}</span>
        </div>
        <div className="ac-upcoming-card__field">
          <span className="ac-upcoming-card__label">Accessibility Support</span>
          <span className="ac-upcoming-card__value">View appointment accessibility status</span>
        </div>
      </div>

      <div className="ac-upcoming-card__footer">
        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate(`/patient/appointments/${encodeURIComponent(appointment.id)}`)}
        >
          View Full Details
        </Button>
        <Button variant="ghost" size="medium" onClick={() => navigate('/patient/communication')}>
          Quick Communication →
        </Button>
      </div>
    </Card>
  );
};

export default UpcomingAppointmentCard;
