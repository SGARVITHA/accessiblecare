import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import staffService from '../../services/staffService';
import type { AppointmentWorkspaceDetail } from '../../types/staff';
import './StaffAppointmentWorkspacePage.css';

export default function StaffAppointmentWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = id || 'A501';

  const [workspace, setWorkspace] = useState<AppointmentWorkspaceDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deskMessage, setDeskMessage] = useState<string>(
    'Please proceed to ENT Reception Room A-104 when called.'
  );
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const loadWorkspace = () => {
    setIsLoading(true);
    setError(null);
    staffService
      .getAppointmentWorkspace(appointmentId)
      .then((data) => {
        setWorkspace(data);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Unable to load appointment workspace.');
        setIsLoading(false);
      });
  };

  useEffect(() => {
    let active = true;
    staffService
      .getAppointmentWorkspace(appointmentId)
      .then((data) => {
        if (active) {
          setWorkspace(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError('Unable to load appointment workspace.');
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appointmentId]);

  const triggerNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => {
      setFeedbackNotice(null);
    }, 3500);
  };

  const handleApproveDispatch = async () => {
    await staffService.approveDispatchStrategy(appointmentId);
    loadWorkspace();
    triggerNotice('Parallel dispatch sent to Anitha Rajan and Priya Patel.');
  };

  const handleAssignInterpreter = async (candidateId: string, candidateName: string) => {
    await staffService.assignInterpreter(appointmentId, candidateId);
    loadWorkspace();
    triggerNotice(`Coordinator confirmed final assignment: ${candidateName}.`);
  };

  const handleSimulateCancellation = async () => {
    await staffService.simulateInterpreterCancellation(appointmentId);
    loadWorkspace();
    triggerNotice('Simulated event: Primary interpreter Anitha Rajan cancelled.');
  };

  const handleApproveFallback = async (candidateId: string, candidateName: string) => {
    await staffService.approveFallbackAssignment(appointmentId, candidateId);
    loadWorkspace();
    triggerNotice(`Fallback approved: ${candidateName} confirmed as remote assignment.`);
  };

  const handleSendDeskNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!deskMessage.trim()) return;
    await staffService.sendDeskNotice(appointmentId, deskMessage.trim());
    setDeskMessage('');
    loadWorkspace();
    triggerNotice('Administrative notice transmitted to clinic reception desk.');
  };

  const handleReset = async () => {
    await staffService.resetScenario();
    loadWorkspace();
    triggerNotice('Demo scenario reset to initial state.');
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
        <p className="body-large" style={{ color: 'var(--color-on-surface-variant)' }}>
          Loading appointment workspace for {appointmentId}...
        </p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <Card padding="large" style={{ textAlign: 'center', margin: 'var(--space-6) 0' }}>
        <h2 className="headline-small" style={{ color: 'var(--color-error)' }}>
          Appointment Not Found
        </h2>
        <p className="body-medium" style={{ color: 'var(--color-on-surface-variant)', margin: 'var(--space-4) 0' }}>
          {error || `Appointment ${appointmentId} could not be loaded.`}
        </p>
        <Link to="/staff/appointments">
          <Button variant="primary">Return to Appointments Roster</Button>
        </Link>
      </Card>
    );
  }

  const {
    appointment,
    requirements,
    ai_recommendation,
    candidates,
    timeline,
    routine_messages,
    assigned_interpreter,
    fallback_active,
    fallback_recommendation,
  } = workspace;

  // Stepper state calculation
  const isCoordinating = appointment.visit_status === 'COORDINATING' || appointment.visit_status === 'ESCALATED';
  const isConfirmed = appointment.visit_status === 'INTERPRETER_CONFIRMED' || appointment.visit_status === 'CHECKED_IN';
  const isCheckedIn = appointment.visit_status === 'CHECKED_IN';

  const hasResponses = candidates.some((c) => c.response_status === 'ACCEPTED');

  return (
    <div className="ac-staff-workspace">
      {/* Toast Feedback */}
      {feedbackNotice && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 50,
            padding: '12px 20px',
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span aria-hidden="true">✓</span>
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="ac-staff-ws-header">
        <div className="ac-staff-ws-title-row">
          <div className="ac-staff-ws-title-group">
            <h1 className="ac-staff-ws-h1">Appointment {appointment.id}</h1>
            <span className="ac-staff-ws-patient-tag">
              Patient {appointment.patient_mrn} ({appointment.patient_name})
            </span>
            <span className="ac-staff-ws-meta-sep" aria-hidden="true">·</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface)' }}>
              {appointment.department} · {appointment.room}
            </span>
            <span className="ac-staff-ws-meta-sep" aria-hidden="true">·</span>
            <span style={{ fontSize: '0.9375rem', color: 'var(--color-on-surface-variant)' }}>
              {appointment.scheduled_time}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <StatusBadge
              status={
                appointment.visit_status === 'INTERPRETER_CONFIRMED'
                  ? 'confirmed'
                  : appointment.visit_status === 'CHECKED_IN'
                  ? 'checked_in'
                  : appointment.visit_status === 'ESCALATED'
                  ? 'escalated'
                  : 'coordinating'
              }
              label={
                appointment.visit_status === 'INTERPRETER_CONFIRMED'
                  ? 'Interpreter Confirmed'
                  : appointment.visit_status === 'CHECKED_IN'
                  ? 'Patient Checked In'
                  : appointment.visit_status === 'ESCALATED'
                  ? 'Escalated / Fallback'
                  : 'Coordinating'
              }
            />
            <Button variant="secondary" size="medium" onClick={handleReset} title="Reset demo state">
              ↺ Reset
            </Button>
          </div>
        </div>

        {/* Requirements Summary Strip */}
        <div className="ac-staff-requirements-strip">
          <div className="ac-staff-req-pills">
            <span className="ac-staff-req-label">Validated Requirements:</span>
            <span className="ac-staff-req-chip ac-staff-req-chip--primary">
              <span aria-hidden="true">🤟</span>
              <span>{requirements.language}</span>
            </span>
            <span className="ac-staff-req-chip">
              <span>Interpreter Required</span>
            </span>
            <span className="ac-staff-req-chip ac-staff-req-chip--secondary">
              <span aria-hidden="true">📍</span>
              <span>{requirements.preferred_mode === 'IN_PERSON' ? 'In-Person Preferred' : 'Remote'}</span>
            </span>
            {requirements.remote_fallback_accepted && (
              <span className="ac-staff-req-chip">
                <span aria-hidden="true">💻</span>
                <span>Remote Accepted</span>
              </span>
            )}
            <span className="ac-staff-req-chip">
              <span>Companion: None</span>
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Policy Enforced: Non-Clinical Dispatch Scope
          </div>
        </div>

        {/* Visit Progression Stepper */}
        <div className="ac-staff-stepper">
          <div className="ac-staff-stepper-inner">
            <div className="ac-staff-stepper-line" aria-hidden="true" />

            <div className="ac-staff-step-item">
              <div className="ac-staff-step-node ac-staff-step-node--completed">✓</div>
              <span className="ac-staff-step-label ac-staff-step-label--active">
                Preferences Confirmed
              </span>
            </div>

            <div className="ac-staff-step-item">
              <div
                className={`ac-staff-step-node ${
                  isCoordinating
                    ? 'ac-staff-step-node--active'
                    : isConfirmed
                    ? 'ac-staff-step-node--completed'
                    : ''
                }`}
              >
                {isConfirmed ? '✓' : '2'}
              </div>
              <span
                className={`ac-staff-step-label ${
                  isCoordinating || isConfirmed ? 'ac-staff-step-label--active' : ''
                }`}
              >
                Coordinating
              </span>
            </div>

            <div className="ac-staff-step-item">
              <div
                className={`ac-staff-step-node ${
                  isConfirmed ? 'ac-staff-step-node--completed' : ''
                }`}
              >
                {isConfirmed ? '✓' : '3'}
              </div>
              <span
                className={`ac-staff-step-label ${
                  isConfirmed ? 'ac-staff-step-label--active' : ''
                }`}
              >
                Interpreter Confirmed
              </span>
            </div>

            <div className="ac-staff-step-item">
              <div
                className={`ac-staff-step-node ${
                  isCheckedIn ? 'ac-staff-step-node--completed' : ''
                }`}
              >
                4
              </div>
              <span className="ac-staff-step-label">Checked In</span>
            </div>

            <div className="ac-staff-step-item">
              <div className="ac-staff-step-node">5</div>
              <span className="ac-staff-step-label">In Service</span>
            </div>

            <div className="ac-staff-step-item">
              <div className="ac-staff-step-node">6</div>
              <span className="ac-staff-step-label">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="ac-staff-ws-grid">
        {/* LEFT COLUMN: Coordination Workflows */}
        <div className="ac-staff-ws-col-main">
          {/* Confirmed Interpreter Banner if Assigned */}
          {assigned_interpreter && (
            <div
              className="ac-staff-card-section"
              style={{
                borderLeft: '4px solid var(--color-status-success)',
                backgroundColor: '#f6fdf9',
              }}
            >
              <div className="ac-staff-card-section__header" style={{ borderBottomColor: '#d2f3e1' }}>
                <div className="ac-staff-card-section__title-group">
                  <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>✅</span>
                  <h2 className="ac-staff-card-section__title" style={{ color: 'var(--color-status-success)' }}>
                    Confirmed Assignment: {assigned_interpreter.name}
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--color-status-success-bg)',
                    color: 'var(--color-status-success)',
                  }}
                >
                  ASSIGNED & CONFIRMED
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--color-primary-container)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {assigned_interpreter.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{assigned_interpreter.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                      {assigned_interpreter.certification} · Badge #{assigned_interpreter.badge_number}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.875rem' }}>
                  <strong>Mode:</strong> {assigned_interpreter.mode === 'IN_PERSON' ? 'In-Person (Room A-104)' : 'Remote Tele-ISL'}
                </div>
              </div>

              {/* Simulation Trigger to Demonstrate Cancellation Workflow */}
              <div style={{ borderTop: '1px solid #d2f3e1', paddingTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                  Demo Action: Test system resilience if assigned interpreter cancels.
                </span>
                <Button
                  variant="danger"
                  size="medium"
                  onClick={handleSimulateCancellation}
                >
                  ⚡ Simulate Interpreter Cancellation
                </Button>
              </div>
            </div>
          )}

          {/* Cancellation & Fallback Protocol Card */}
          {fallback_active && fallback_recommendation && (
            <div className="ac-staff-card-section ac-staff-card-section--alert">
              <div className="ac-staff-card-section__header">
                <div className="ac-staff-card-section__title-group">
                  <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <h2 className="ac-staff-card-section__title" style={{ color: 'var(--color-error)' }}>
                    Fallback Required: Primary Interpreter Cancelled
                  </h2>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--color-error-container)',
                    color: 'var(--color-error)',
                  }}
                >
                  ACTION REQUIRED
                </span>
              </div>

              <div className="ac-staff-callout-banner ac-staff-callout-banner--alert">
                <strong>Cancellation Notice:</strong> Anitha Rajan has cancelled due to unforeseen medical transit delay. The system has automatically activated zero-latency standby coordination.
              </div>

              <div className="ac-staff-rationale-box">
                <strong style={{ color: 'var(--color-primary)' }}>AI Fallback Recommendation:</strong>{' '}
                {fallback_recommendation.rationale}
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-low)',
                  border: '1px solid var(--color-surface-base)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)' }}>
                    {fallback_recommendation.candidate.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                    {fallback_recommendation.candidate.certification} · {fallback_recommendation.candidate.mode === 'REMOTE' ? 'Remote Tele-ISL Hub' : 'In-Person'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)', marginTop: '4px' }}>
                    Status: Authenticated on video terminal, ready on instant standby.
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="large"
                  onClick={() =>
                    handleApproveFallback(
                      fallback_recommendation.candidate.id,
                      fallback_recommendation.candidate.name
                    )
                  }
                >
                  Approve Fallback Assignment ({fallback_recommendation.candidate.name})
                </Button>
              </div>
            </div>
          )}

          {/* Section A: AI Recommendation & Candidate Review */}
          <div className="ac-staff-card-section">
            <div className="ac-staff-card-section__header">
              <div className="ac-staff-card-section__title-group">
                <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>✦</span>
                <h2 className="ac-staff-card-section__title">AI Recommendation</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ac-staff-governance-badge">
                  <span aria-hidden="true">⚖️</span>
                  <span>{ai_recommendation.governance_rule}</span>
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--color-surface-low)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}>
                  Recommended Dispatch Strategy:{' '}
                </span>
                <strong style={{ fontSize: '0.9375rem', color: 'var(--color-primary)' }}>
                  {ai_recommendation.strategy_name}
                </strong>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                {ai_recommendation.policy_reference}
              </span>
            </div>

            {/* Candidates Preview Grid */}
            <div className="ac-staff-candidates-grid">
              {candidates.map((cand) => {
                const isPrimary = cand.is_primary_recommendation;
                const isUnavailable = cand.response_status === 'UNAVAILABLE';
                return (
                  <div
                    key={cand.id}
                    className={`ac-staff-candidate-card ${
                      isPrimary ? 'ac-staff-candidate-card--primary' : ''
                    } ${isUnavailable ? 'ac-staff-candidate-card--unavailable' : ''}`}
                  >
                    <div>
                      <div className="ac-staff-candidate-card__top">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            className={`ac-staff-candidate-card__avatar ${
                              !isPrimary ? 'ac-staff-candidate-card__avatar--secondary' : ''
                            }`}
                          >
                            {cand.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{cand.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                              {cand.language} · {cand.mode === 'IN_PERSON' ? 'In-Person' : 'Remote Tele-ISL'}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: isUnavailable
                              ? 'var(--color-surface-high)'
                              : isPrimary
                              ? 'var(--color-primary-container)'
                              : 'var(--color-secondary-container)',
                            color: isUnavailable
                              ? 'var(--color-outline)'
                              : isPrimary
                              ? '#ffffff'
                              : 'var(--color-on-secondary-container)',
                          }}
                        >
                          {isUnavailable ? 'Unavailable' : isPrimary ? 'Primary Match' : 'Fallback Standby'}
                        </span>
                      </div>

                      <div className="ac-staff-candidate-card__meta-list" style={{ marginTop: '10px' }}>
                        <div>⏱ {cand.availability_window}</div>
                        <div>📍 {cand.proximity_station}</div>
                        <div>🆔 Badge #{cand.badge_number} · Shift: {cand.shift}</div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--color-surface-base)', paddingTop: '8px', fontSize: '0.75rem', color: 'var(--color-on-surface-variant)' }}>
                      {cand.certification}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI Rationale */}
            <div className="ac-staff-rationale-box">
              <strong style={{ color: 'var(--color-primary)' }}>AI Matching Rationale:</strong>{' '}
              {ai_recommendation.rationale}
            </div>

            {/* Governance Callout */}
            <div className="ac-staff-callout-banner">
              <strong>Human Coordinator Oversight:</strong> The AI orchestrator calculates policy-compatible candidates. Dispatching notifications and issuing offers requires human staff approval.
            </div>

            {/* Dispatch Action */}
            {!hasResponses && !assigned_interpreter && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Button variant="primary" size="large" onClick={handleApproveDispatch}>
                  ✓ Approve & Send Parallel Requests
                </Button>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                  Sends simultaneous dispatch offers to top 2 compatible candidates.
                </span>
              </div>
            )}
          </div>

          {/* Section B: Responses Logged & "Accepted ≠ Assigned" */}
          {hasResponses && !assigned_interpreter && (
            <div className="ac-staff-card-section">
              <div className="ac-staff-card-section__header">
                <div className="ac-staff-card-section__title-group">
                  <span aria-hidden="true" style={{ fontSize: '1.25rem' }}>📨</span>
                  <h3 className="ac-staff-card-section__title">
                    Interpreter Responses Logged (2 Candidates Accepted)
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: 'var(--color-secondary-container)',
                    color: 'var(--color-on-secondary-container)',
                  }}
                >
                  RESPONSES RECEIVED
                </span>
              </div>

              {/* Crucial Rule Banner */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-low)',
                  border: '1px solid var(--color-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.875rem',
                  color: 'var(--color-primary)',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '1.125rem' }}>ℹ️</span>
                <span>
                  <strong>Accepted ≠ Assigned:</strong> Both candidates have confirmed availability. The coordinator holds sole accountability to select and confirm the final assignment.
                </span>
              </div>

              {/* Response Cards with Final Assignment Buttons */}
              <div className="ac-staff-candidates-grid">
                {candidates
                  .filter((c) => c.response_status === 'ACCEPTED')
                  .map((cand) => (
                    <div
                      key={cand.id}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-surface-low)',
                        border: '1px solid var(--color-surface-base)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-on-surface)' }}>
                              {cand.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                              {cand.mode === 'IN_PERSON' ? 'In-Person Primary' : 'Remote Standby'}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: 'var(--color-status-success)',
                              backgroundColor: 'var(--color-status-success-bg)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-pill)',
                            }}
                          >
                            ✓ Accepted {cand.response_timestamp || '09:46 AM'}
                          </span>
                        </div>

                        <p style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', margin: '8px 0 0 0' }}>
                          {cand.mode === 'IN_PERSON'
                            ? 'Confirmed on-site. Ready to meet patient at ENT Room A-104.'
                            : 'Logged in on Tele-ISL video terminal. Pre-authenticated standby.'}
                        </p>
                      </div>

                      <Button
                        variant={cand.is_primary_recommendation ? 'primary' : 'secondary'}
                        size="medium"
                        fullWidth
                        onClick={() => handleAssignInterpreter(cand.id, cand.name)}
                      >
                        Assign {cand.name} ({cand.mode === 'IN_PERSON' ? 'In-Person Primary' : 'Remote Backup'})
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Routine Desk Communication & Activity Audit Trail */}
        <div className="ac-staff-ws-col-side">
          {/* Routine Communication */}
          <section aria-labelledby="desk-comm-heading" className="ac-staff-card-section">
            <div className="ac-staff-card-section__header">
              <div className="ac-staff-card-section__title-group">
                <span aria-hidden="true">💬</span>
                <h3 id="desk-comm-heading" className="ac-staff-card-section__title">
                  Routine Desk Communication
                </h3>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 600 }}>
                Desk Terminal
              </span>
            </div>

            <div
              style={{
                padding: '10px 12px',
                backgroundColor: 'var(--color-surface-low)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                color: 'var(--color-on-surface-variant)',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: 'var(--color-on-surface)', display: 'block', marginBottom: '2px' }}>
                Administrative Coordination Only
              </strong>
              For clinical conversations, a qualified sign language interpreter must facilitate.
            </div>

            <form onSubmit={handleSendDeskNotice} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                htmlFor="desk-msg-input"
                style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' }}
              >
                Wayfinding / Arrival Notice
              </label>
              <textarea
                id="desk-msg-input"
                rows={2}
                className="ac-staff-chat-textarea"
                value={deskMessage}
                onChange={(e) => setDeskMessage(e.target.value)}
                placeholder="Enter administrative notification for room display..."
              />
              <Button type="submit" variant="secondary" size="medium" fullWidth>
                Send Desk Notice
              </Button>
            </form>

            {/* Routine Messages Feed */}
            {routine_messages.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-surface-base)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-outline)', textTransform: 'uppercase' }}>
                  Transmitted Notices:
                </span>
                {routine_messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-surface-low)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-on-surface-variant)', fontSize: '0.6875rem' }}>
                      <span>{msg.sender_name}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div style={{ marginTop: '2px', color: 'var(--color-on-surface)' }}>{msg.text}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Activity & Audit Trail */}
          <section aria-labelledby="audit-trail-heading" className="ac-staff-card-section">
            <div className="ac-staff-card-section__header">
              <div className="ac-staff-card-section__title-group">
                <span aria-hidden="true">📜</span>
                <h3 id="audit-trail-heading" className="ac-staff-card-section__title">
                  Activity & Audit Trail
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--color-surface-base)',
                  color: 'var(--color-on-surface-variant)',
                }}
              >
                Immutable Log
              </span>
            </div>

            <ol className="ac-staff-timeline">
              {timeline.map((event) => {
                const isAlert = event.badge_variant === 'alert';
                const isSuccess = event.badge_variant === 'success';
                return (
                  <li
                    key={event.id}
                    className={`ac-staff-timeline-item ${
                      isAlert
                        ? 'ac-staff-timeline-item--alert'
                        : isSuccess
                        ? 'ac-staff-timeline-item--success'
                        : ''
                    }`}
                  >
                    <div className="ac-staff-timeline-header">
                      <span className="ac-staff-timeline-time">{event.timestamp}</span>
                      <span className="ac-staff-timeline-actor">{event.actor_role}</span>
                    </div>
                    <p className="ac-staff-timeline-desc">{event.description}</p>
                  </li>
                );
              })}
            </ol>

            <div
              style={{
                borderTop: '1px solid var(--color-surface-base)',
                paddingTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.6875rem',
                color: 'var(--color-outline)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)' }}>#LOG-A501</span>
              <span style={{ color: 'var(--color-secondary)', fontWeight: 600 }}>
                HIPAA & ADA Compliant Log
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
