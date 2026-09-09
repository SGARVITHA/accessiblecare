import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import patientService from '../../services/patientService';
import type { PatientDashboardSummary } from '../../types/patient';

import NextStepCard from './components/NextStepCard';
import UpcomingAppointmentCard from './components/UpcomingAppointmentCard';
import TodayCareFlow from './components/TodayCareFlow';
import AccessibilitySummaryCard from './components/AccessibilitySummaryCard';
import InterpreterSummaryCard from './components/InterpreterSummaryCard';
import SupportWayfinding from './components/SupportWayfinding';
import DashboardReminders from './components/DashboardReminders';

import './PatientDashboard.css';

export default function PatientDashboard() {
  const [summary, setSummary] = useState<PatientDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    setError(null);
    patientService
      .getPatientDashboard()
      .then((data) => {
        setSummary(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError('We couldn’t load your care dashboard details right now.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    patientService
      .getPatientDashboard()
      .then((data) => {
        if (active) {
          setSummary(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('We couldn’t load your care dashboard details right now.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="ac-dashboard-loading" style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
        <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
          Loading your accessible care dashboard...
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <Card padding="large" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
        <h2 className="headline-small" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>
          Unable to Load Dashboard
        </h2>
        <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
          {error || 'An unexpected error occurred while retrieving your appointment information.'}
        </p>
        <Button variant="primary" onClick={loadData}>
          Try Again
        </Button>
      </Card>
    );
  }

  const patientName = summary.patient.full_name || 'Rohan';
  const mrn = summary.patient.mrn || 'P1024';

  return (
    <div className="ac-patient-dashboard">
      {/* Patient Greeting & Header */}
      <PageHeader
        eyebrow={`PATIENT PORTAL • MRN ${mrn}`}
        title={`Welcome back, ${patientName}`}
        description="Your communication preferences and interpreter support are actively coordinated for today's visit."
        action={
          <StatusBadge status="confirmed" label="Visual Alerts Active" />
        }
      />

      {/* Primary Focal Area: Your Next Step Banner */}
      <NextStepCard appointment={summary.next_appointment} />

      {/* Main Dashboard Responsive Grid */}
      <div className="ac-patient-dashboard__grid">
        {/* Main Left Column */}
        <div className="ac-patient-dashboard__col-main">
          <UpcomingAppointmentCard
            appointment={summary.next_appointment}
            interpreterStatus={summary.interpreter_status}
          />
          <TodayCareFlow />
          <SupportWayfinding />
        </div>

        {/* Secondary Right Column */}
        <div className="ac-patient-dashboard__col-side">
          <AccessibilitySummaryCard profile={summary.accessibility_profile} />
          <InterpreterSummaryCard interpreterStatus={summary.interpreter_status} />
          <DashboardReminders notifications={summary.notifications} />
        </div>
      </div>
    </div>
  );
}
