import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import staffService from '../../services/staffService';
import type { StaffAppointmentSummary } from '../../types/staff';
import './StaffAppointmentsPage.css';

type FilterTab = 'ALL' | 'AWAITING_APPROVAL' | 'CONFIRMED' | 'CHECKED_IN' | 'ESCALATED';

export default function StaffAppointmentsPage() {
  const [appointments, setAppointments] = useState<StaffAppointmentSummary[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = (filter: FilterTab) => {
    setIsLoading(true);
    setError(null);
    staffService
      .getAppointments(filter)
      .then((data) => {
        setAppointments(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Could not load appointments roster.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    staffService
      .getAppointments(activeTab)
      .then((data) => {
        if (active) {
          setAppointments(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not load appointments roster.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab]);

  const filteredAppointments = appointments.filter((appt) => {
    const q = searchQuery.toLowerCase();
    return (
      appt.patient_name.toLowerCase().includes(q) ||
      appt.patient_mrn.toLowerCase().includes(q) ||
      appt.id.toLowerCase().includes(q) ||
      appt.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="ac-staff-appointments-page">
      <PageHeader
        eyebrow="OPERATIONAL DIRECTORY • ACCESSIBILITY SERVICES"
        title="Accessibility Appointments"
        description="Filter and coordinate hospital encounters with active sign language, speech-to-text, or visual wayfinding requirements."
      />

      {/* Filter and Search Bar */}
      <div className="ac-staff-filter-bar">
        <div className="ac-staff-filter-tabs" role="tablist" aria-label="Appointment Filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            className={`ac-staff-filter-btn ${activeTab === 'ALL' ? 'ac-staff-filter-btn--active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Encounters
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'AWAITING_APPROVAL'}
            className={`ac-staff-filter-btn ${
              activeTab === 'AWAITING_APPROVAL' ? 'ac-staff-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('AWAITING_APPROVAL')}
          >
            Awaiting Approval
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'CONFIRMED'}
            className={`ac-staff-filter-btn ${
              activeTab === 'CONFIRMED' ? 'ac-staff-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('CONFIRMED')}
          >
            Confirmed
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'CHECKED_IN'}
            className={`ac-staff-filter-btn ${
              activeTab === 'CHECKED_IN' ? 'ac-staff-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('CHECKED_IN')}
          >
            Checked In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ESCALATED'}
            className={`ac-staff-filter-btn ${
              activeTab === 'ESCALATED' ? 'ac-staff-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('ESCALATED')}
          >
            Escalated
          </button>
        </div>

        <div className="ac-staff-search-box">
          <span aria-hidden="true" style={{ color: 'var(--color-outline)' }}>🔍</span>
          <input
            type="text"
            className="ac-staff-search-input"
            placeholder="Search by Patient, ID, Room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Filter appointments directory"
          />
        </div>
      </div>

      {/* Appointments List / Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
            Loading appointments roster...
          </p>
        </div>
      ) : error ? (
        <Card padding="large" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
          <Button variant="primary" onClick={() => loadData(activeTab)}>
            Retry
          </Button>
        </Card>
      ) : filteredAppointments.length === 0 ? (
        <Card padding="large" style={{ textAlign: 'center' }}>
          <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
            No appointments found for the selected filter.
          </p>
        </Card>
      ) : (
        <div className="ac-staff-appointments-list">
          {filteredAppointments.map((appt) => {
            const isUrgent = appt.action_required;
            return (
              <article
                key={appt.id}
                className={`ac-staff-appt-card ${isUrgent ? 'ac-staff-appt-card--urgent' : ''}`}
              >
                <div className="ac-staff-appt-card__header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: 'var(--color-secondary)',
                          backgroundColor: 'var(--color-surface-low)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {appt.id}
                      </span>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {appt.patient_name} (MRN: {appt.patient_mrn})
                      </span>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                      {appt.department} · {appt.room}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge
                      status={
                        appt.visit_status === 'INTERPRETER_CONFIRMED'
                          ? 'confirmed'
                          : appt.visit_status === 'CHECKED_IN'
                          ? 'checked_in'
                          : appt.visit_status === 'ESCALATED'
                          ? 'escalated'
                          : 'coordinating'
                      }
                      label={
                        appt.visit_status === 'INTERPRETER_CONFIRMED'
                          ? 'Confirmed'
                          : appt.visit_status === 'CHECKED_IN'
                          ? 'Checked In'
                          : appt.visit_status === 'ESCALATED'
                          ? 'Escalated'
                          : 'Coordinating'
                      }
                    />
                  </div>
                </div>

                <div className="ac-staff-appt-card__details-grid">
                  <div className="ac-staff-appt-card__meta-item">
                    <span className="ac-staff-appt-card__meta-label">Schedule</span>
                    <span className="ac-staff-appt-card__meta-value">{appt.scheduled_time}</span>
                  </div>

                  <div className="ac-staff-appt-card__meta-item">
                    <span className="ac-staff-appt-card__meta-label">Validated Language</span>
                    <span className="ac-staff-appt-card__meta-value">
                      🤟 {appt.validated_language}
                    </span>
                  </div>

                  <div className="ac-staff-appt-card__meta-item">
                    <span className="ac-staff-appt-card__meta-label">Preferred Mode</span>
                    <span className="ac-staff-appt-card__meta-value">
                      {appt.preferred_mode === 'IN_PERSON' ? 'In-Person Preferred' : 'Remote'}
                      {appt.remote_accepted ? ' · Fallback Accepted' : ''}
                    </span>
                  </div>

                  <div className="ac-staff-appt-card__meta-item">
                    <span className="ac-staff-appt-card__meta-label">Interpreter Status</span>
                    <span
                      className="ac-staff-appt-card__meta-value"
                      style={{
                        color:
                          appt.visit_status === 'ESCALATED'
                            ? 'var(--color-error)'
                            : appt.visit_status === 'INTERPRETER_CONFIRMED'
                            ? 'var(--color-status-success)'
                            : 'var(--color-secondary)',
                      }}
                    >
                      {appt.interpreter_status_label}
                    </span>
                  </div>
                </div>

                <div className="ac-staff-appt-card__footer">
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                    Policy Enforced: Non-clinical administrative dispatch scope.
                  </span>

                  <Link to={`/staff/appointments/${appt.id}`}>
                    <Button variant={isUrgent ? 'primary' : 'secondary'} size="medium">
                      {isUrgent ? 'Open Workspace & Coordinate' : 'View Coordination Details'}
                    </Button>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
