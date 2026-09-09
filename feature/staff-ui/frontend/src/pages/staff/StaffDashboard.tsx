import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import staffService from '../../services/staffService';
import type { StaffDashboardData } from '../../types/staff';
import './StaffDashboard.css';

export default function StaffDashboard() {
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const navigate = useNavigate();

  const loadDashboard = () => {
    setIsLoading(true);
    setError(null);
    staffService
      .getDashboardData()
      .then((dashboardData) => {
        setData(dashboardData);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Unable to load operational dashboard. Please retry.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    staffService
      .getDashboardData()
      .then((dashboardData) => {
        if (active) {
          setData(dashboardData);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load operational dashboard.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-8) 0', textAlign: 'center' }}>
        <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
          Loading staff operational overview...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card padding="large" style={{ textAlign: 'center', margin: 'var(--space-6) 0' }}>
        <h2 className="headline-small" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>
          Operational Error
        </h2>
        <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-4)' }}>
          {error || 'Could not retrieve operational data.'}
        </p>
        <Button variant="primary" onClick={loadDashboard}>
          Retry
        </Button>
      </Card>
    );
  }

  const filteredAppointments = data.today_appointments.filter((appt) => {
    const q = searchQuery.toLowerCase();
    return (
      appt.patient_name.toLowerCase().includes(q) ||
      appt.patient_mrn.toLowerCase().includes(q) ||
      appt.id.toLowerCase().includes(q) ||
      appt.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="ac-staff-dashboard">
      <PageHeader
        eyebrow="STAFF OPERATIONS • OUTPATIENT BLOCK A"
        title="Good morning, Elena"
        description="Review AI-assisted interpreter recommendations, approve parallel dispatches, and coordinate active accessibility encounters."
        action={
          <Button
            variant="secondary"
            onClick={() => {
              staffService.resetScenario().then(() => loadDashboard());
            }}
            title="Reset demo scenario to initial state"
          >
            ↺ Reset Demo Scenario
          </Button>
        }
      />

      {/* Operational Metrics Strip */}
      <section aria-label="Key Operational Metrics" className="ac-staff-metrics-grid">
        <div className="ac-staff-metric-card">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Total Requests</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">📋</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value">
              {data.metrics.total_accessibility_requests_today}
            </span>
            <span className="ac-staff-metric-card__subtitle">Today</span>
          </div>
        </div>

        <div className="ac-staff-metric-card ac-staff-metric-card--alert">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Needs Attention</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">🔔</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value">
              {data.metrics.needs_attention_count}
            </span>
            <span className="ac-staff-metric-card__subtitle">Require Staff Action</span>
          </div>
        </div>

        <div className="ac-staff-metric-card">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Confirmed Sessions</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">✅</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value">
              {data.metrics.confirmed_sessions_count}
            </span>
            <span className="ac-staff-metric-card__subtitle">Scheduled Today</span>
          </div>
        </div>

        <div className="ac-staff-metric-card ac-staff-metric-card--alert">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Open Escalations</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">⚠️</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value">
              {data.metrics.open_escalations_count}
            </span>
            <span className="ac-staff-metric-card__subtitle">Pending Resolution</span>
          </div>
        </div>
      </section>

      {/* Needs Attention High-Priority Cards */}
      <section aria-labelledby="needs-attention-heading" className="ac-staff-attention-section">
        <div className="ac-staff-attention-header">
          <h2 id="needs-attention-heading" className="ac-staff-attention-title">
            Needs Attention ({data.needs_attention.length})
          </h2>
          <span className="ac-staff-attention-subtitle">
            Urgent coordination tasks requiring human approval or contingency action.
          </span>
        </div>

        <div className="ac-staff-attention-grid">
          {data.needs_attention.map((item) => {
            const isAlert = item.visit_status === 'ESCALATED' || item.urgent_badge?.includes('Cancelled');
            return (
              <div
                key={item.id}
                className={`ac-staff-action-card ${
                  isAlert ? 'ac-staff-action-card--alert' : 'ac-staff-action-card--coordinating'
                }`}
              >
                <div className="ac-staff-action-card__top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={`ac-staff-action-card__badge-id ${
                        isAlert ? 'ac-staff-action-card__badge-id--alert' : ''
                      }`}
                    >
                      {item.id}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      {item.department} · {item.scheduled_time.split(',')[1] || item.scheduled_time}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                    Patient {item.patient_mrn} ({item.patient_name})
                  </span>
                </div>

                <div className="ac-staff-action-card__main-info">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="ac-staff-action-card__title">
                      {isAlert ? 'Assigned interpreter cancelled' : 'Interpreter approval required'}
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: isAlert ? 'var(--color-error-container)' : 'var(--color-secondary-container)',
                        color: isAlert ? 'var(--color-error)' : 'var(--color-on-secondary-container)',
                      }}
                    >
                      {item.urgent_badge || item.interpreter_status_label}
                    </span>
                  </div>
                  <p className="ac-staff-action-card__description">
                    {isAlert
                      ? 'In-person interpreter cancelled 25m prior. Standby Tele-ISL candidate identified.'
                      : 'AI recommendation synthesized: Parallel Top 2 dispatch ready for staff review.'}
                  </p>
                </div>

                <div>
                  <span className="ac-staff-action-card__requirement-pill">
                    <span aria-hidden="true">🤟</span>
                    <span>
                      {item.validated_language} • {item.preferred_mode === 'IN_PERSON' ? 'In-Person Preferred' : 'Remote'}
                      {item.remote_accepted ? ' (Remote Accepted)' : ''}
                    </span>
                  </span>
                </div>

                <div className="ac-staff-action-card__actions">
                  <Button
                    variant={isAlert ? 'danger' : 'primary'}
                    size="medium"
                    onClick={() => navigate(`/staff/appointments/${item.id}`)}
                  >
                    {isAlert ? 'Review Fallback Standby' : 'Review & Coordinate'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="medium"
                    onClick={() => navigate(`/staff/appointments/${item.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Today's Accessibility Queue Section */}
      <section aria-labelledby="today-queue-heading" className="ac-staff-roster-card">
        <div className="ac-staff-roster-toolbar">
          <div>
            <h2 id="today-queue-heading" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0 }}>
              Today's Accessibility Appointments
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: '4px 0 0 0' }}>
              Roster of scheduled hospital visits requiring accommodation support.
            </p>
          </div>

          <div className="ac-staff-search-box">
            <span aria-hidden="true" style={{ color: 'var(--color-outline)' }}>🔍</span>
            <input
              type="text"
              className="ac-staff-search-input"
              placeholder="Search Patient, ID, Dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter today's appointments"
            />
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6) 0', color: 'var(--color-on-surface-variant)' }}>
            No appointments match your search filter.
          </div>
        ) : (
          <div className="ac-staff-table-wrapper">
            <table className="ac-staff-table">
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Appointment & Patient</th>
                  <th scope="col">Department & Location</th>
                  <th scope="col">Accessibility Need</th>
                  <th scope="col">Interpreter Status</th>
                  <th scope="col">Visit Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => {
                  const isUrgent = appt.action_required;
                  return (
                    <tr
                      key={appt.id}
                      className={isUrgent ? 'ac-staff-table__row--urgent' : ''}
                    >
                      <td style={{ fontWeight: 700, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                        {appt.scheduled_time.split(',')[1]?.trim() || appt.scheduled_time}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-secondary)' }}>
                            {appt.id}
                          </span>
                          <span style={{ color: 'var(--color-outline)' }}>·</span>
                          <span style={{ fontWeight: 600 }}>
                            {appt.patient_name} ({appt.patient_mrn})
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, display: 'block' }}>{appt.department}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                          {appt.room}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                          <span aria-hidden="true">🤟</span>
                          <span>{appt.validated_language}</span>
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor:
                              appt.visit_status === 'ESCALATED'
                                ? 'var(--color-error-container)'
                                : appt.visit_status === 'INTERPRETER_CONFIRMED' || appt.visit_status === 'CHECKED_IN'
                                ? 'var(--color-status-success-bg)'
                                : 'var(--color-secondary-container)',
                            color:
                              appt.visit_status === 'ESCALATED'
                                ? 'var(--color-error)'
                                : appt.visit_status === 'INTERPRETER_CONFIRMED' || appt.visit_status === 'CHECKED_IN'
                                ? 'var(--color-status-success)'
                                : 'var(--color-on-secondary-container)',
                          }}
                        >
                          {appt.interpreter_status_label}
                        </span>
                      </td>
                      <td>
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
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <Link to={`/staff/appointments/${appt.id}`}>
                          <Button
                            variant={isUrgent ? 'primary' : 'secondary'}
                            size="medium"
                          >
                            {isUrgent ? 'Coordinate' : 'View'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
