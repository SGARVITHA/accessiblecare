import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button, StatusBadge } from '../../components/ui';
import patientService from '../../services/patientService';
import type { Appointment } from '../../types/patient';
import './AppointmentListPage.css';

export const AppointmentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      setAppointments(await patientService.getPatientAppointments());
    } catch {
      setError('Unable to load your appointments right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  if (loading) {
    return (
      <Card padding="large">
        <div className="appointment-list-state">
          <p>Loading your appointments...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="appointment-list-page">
        <PageHeader
          eyebrow="Patient Appointments"
          title="My Appointments"
          description="View your scheduled hospital visits and accessibility status."
        />
        <Card padding="large">
          <div className="appointment-list-state">
            <h2>Unable to Load Appointments</h2>
            <p>{error}</p>
            <Button variant="primary" onClick={() => void loadAppointments()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="appointment-list-page">
      <PageHeader
        eyebrow="Patient Appointments"
        title="My Appointments"
        description="View your scheduled hospital visits and accessibility status."
      />

      {appointments.length === 0 ? (
        <Card padding="large">
          <div className="appointment-list-state">
            <h2>No Appointments Found</h2>
            <p>You do not currently have any appointments available in AccessibleCare.</p>
          </div>
        </Card>
      ) : (
        <div className="appointment-list" aria-label="Your appointments">
          {appointments.map((appointment) => {
            const reference = appointment.external_id || appointment.id;
            return (
              <Card key={appointment.id} padding="large" className="appointment-list-card">
                <div className="appointment-list-card__header">
                  <div>
                    <span className="appointment-list-card__eyebrow">APPOINTMENT REF: {reference}</span>
                    <h2 className="appointment-list-card__title">
                      {appointment.department || 'Hospital Consultation'}
                    </h2>
                  </div>
                  <StatusBadge
                    status={appointment.status === 'CANCELLED' ? 'cancelled' : 'confirmed'}
                    label={appointment.status.replaceAll('_', ' ')}
                  />
                </div>

                <div className="appointment-list-card__details">
                  <div>
                    <span>Doctor</span>
                    <strong>{appointment.doctor_name || '—'}</strong>
                  </div>
                  <div>
                    <span>Date & Time</span>
                    <strong>{appointment.appointment_time}</strong>
                  </div>
                  <div>
                    <span>Hospital</span>
                    <strong>{appointment.hospital || '—'}</strong>
                  </div>
                </div>

                <div className="appointment-list-card__footer">
                  <Button
                    variant="primary"
                    onClick={() => navigate(`/patient/appointments/${encodeURIComponent(appointment.id)}`)}
                  >
                    View Appointment Details
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AppointmentListPage;
