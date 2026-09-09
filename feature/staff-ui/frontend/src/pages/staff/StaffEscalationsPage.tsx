import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import staffService from '../../services/staffService';
import type { EscalationRecord } from '../../types/staff';
import './StaffEscalationsPage.css';

export default function StaffEscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');

  const loadEscalations = () => {
    setIsLoading(true);
    setError(null);
    staffService
      .getEscalations()
      .then((data) => {
        setEscalations(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Unable to load escalations data.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    staffService
      .getEscalations()
      .then((data) => {
        if (active) {
          setEscalations(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load escalations data.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleResolve = async (id: string) => {
    await staffService.resolveEscalation(id, resolutionNotes || 'Resolved by staff coordinator.');
    setResolvingId(null);
    setResolutionNotes('');
    loadEscalations();
  };

  const openCount = escalations.filter((e) => e.status !== 'RESOLVED').length;
  const criticalCount = escalations.filter((e) => e.status !== 'RESOLVED' && e.priority === 'CRITICAL').length;
  const highCount = escalations.filter((e) => e.status !== 'RESOLVED' && e.priority === 'HIGH').length;

  return (
    <div className="ac-staff-escalations-page">
      <PageHeader
        eyebrow="OPERATIONAL RISK MANAGEMENT • OUTPATIENT CARE"
        title="Escalations Center"
        description="Monitor, triage, and resolve accessibility accommodation bottlenecks, interpreter cancellations, and contingency deployments."
      />

      {/* Summary Strip */}
      <div className="ac-staff-esc-summary-strip">
        <div className="ac-staff-metric-card ac-staff-metric-card--alert">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Total Open Escalations</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">⚠️</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value">{openCount}</span>
            <span className="ac-staff-metric-card__subtitle">Requiring Action</span>
          </div>
        </div>

        <div className="ac-staff-metric-card">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">Critical Priority</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">🚨</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value" style={{ color: 'var(--color-error)' }}>
              {criticalCount}
            </span>
            <span className="ac-staff-metric-card__subtitle">Immediate Attention</span>
          </div>
        </div>

        <div className="ac-staff-metric-card">
          <div className="ac-staff-metric-card__header">
            <span className="ac-staff-metric-card__title">High Priority</span>
            <span className="ac-staff-metric-card__icon" aria-hidden="true">⏱️</span>
          </div>
          <div className="ac-staff-metric-card__value-row">
            <span className="ac-staff-metric-card__value" style={{ color: 'var(--color-status-warning)' }}>
              {highCount}
            </span>
            <span className="ac-staff-metric-card__subtitle">Encounter Imminent</span>
          </div>
        </div>
      </div>

      {/* Escalations List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
          <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
            Loading escalations roster...
          </p>
        </div>
      ) : error ? (
        <Card padding="large" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
          <Button variant="primary" onClick={loadEscalations}>
            Retry
          </Button>
        </Card>
      ) : escalations.length === 0 ? (
        <Card padding="large" style={{ textAlign: 'center' }}>
          <p className="body-large" style={{ color: 'var(--color-status-success)' }}>
            ✓ All accessibility escalations are currently resolved.
          </p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {escalations.map((esc) => {
            const isResolved = esc.status === 'RESOLVED';
            const isCritical = esc.priority === 'CRITICAL';
            const isHigh = esc.priority === 'HIGH';

            return (
              <article
                key={esc.id}
                className={`ac-staff-esc-card ${
                  isResolved
                    ? ''
                    : isCritical
                    ? 'ac-staff-esc-card--critical'
                    : isHigh
                    ? 'ac-staff-esc-card--high'
                    : 'ac-staff-esc-card--medium'
                }`}
                style={{ opacity: isResolved ? 0.7 : 1 }}
              >
                <div className="ac-staff-esc-card__header">
                  <div className="ac-staff-esc-card__title-row">
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem' }}>
                      {esc.id}
                    </span>
                    <span style={{ color: 'var(--color-outline)' }}>·</span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-primary)' }}>
                      Appointment {esc.appointment_id} ({esc.patient_name} - {esc.patient_mrn})
                    </span>
                    <span style={{ color: 'var(--color-outline)' }}>·</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                      {esc.department} · {esc.scheduled_time}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={`ac-staff-esc-priority-badge ${
                        isCritical
                          ? 'ac-staff-esc-priority-badge--critical'
                          : isHigh
                          ? 'ac-staff-esc-priority-badge--high'
                          : 'ac-staff-esc-priority-badge--medium'
                      }`}
                    >
                      {esc.priority}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-pill)',
                        backgroundColor: isResolved ? 'var(--color-status-success-bg)' : 'var(--color-surface-base)',
                        color: isResolved ? 'var(--color-status-success)' : 'var(--color-on-surface-variant)',
                      }}
                    >
                      {esc.status}
                    </span>
                  </div>
                </div>

                <div className="ac-staff-esc-card__content">
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>
                    {esc.summary}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                    <strong>Root Context:</strong> {esc.reason}
                  </p>
                  {esc.resolution_notes && (
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-status-success)', margin: '4px 0 0 0' }}>
                      <strong>Resolution:</strong> {esc.resolution_notes}
                    </p>
                  )}
                </div>

                <div className="ac-staff-esc-card__actions">
                  <Link to={`/staff/appointments/${esc.appointment_id}`}>
                    <Button variant="primary" size="medium">
                      Open Appointment Workspace ({esc.appointment_id})
                    </Button>
                  </Link>

                  {!isResolved && (
                    <>
                      {resolvingId === esc.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', marginTop: '8px' }}>
                          <input
                            type="text"
                            placeholder="Enter resolution notes..."
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--color-surface-high)',
                              fontSize: '0.875rem',
                            }}
                          />
                          <Button variant="secondary" size="medium" onClick={() => handleResolve(esc.id)}>
                            Confirm Resolve
                          </Button>
                          <Button variant="ghost" size="medium" onClick={() => setResolvingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="secondary" size="medium" onClick={() => setResolvingId(esc.id)}>
                          Mark as Resolved
                        </Button>
                      )}
                    </>
                  )}

                  <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', marginLeft: 'auto' }}>
                    Created at {esc.created_at} · Assigned to {esc.assigned_to || 'Elena Vance'}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
