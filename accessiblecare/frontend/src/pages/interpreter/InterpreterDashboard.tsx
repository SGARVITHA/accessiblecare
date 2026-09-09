import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type {
  InterpreterDashboardSummary,
  InterpreterIncomingRequest,
} from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterDashboard.css';

export default function InterpreterDashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<InterpreterDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    interpreterService.getDashboardSummary().then((data) => {
      if (active) {
        setSummary(data);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleQuickAccept = async (req: InterpreterIncomingRequest) => {
    try {
      const result = await interpreterService.respondToRequest(req.id, 'ACCEPT');
      setActionFeedback(result.message);
      // Reload summary
      const updated = await interpreterService.getDashboardSummary();
      setSummary(updated);
    } catch {
      setActionFeedback('Failed to accept request. Please try again.');
    }
  };

  if (isLoading || !summary) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Loading Interpreter Workspace...</p>
      </div>
    );
  }

  const { profile, next_assignment, recent_requests, today_assignments } = summary;

  return (
    <div className="ac-int-dashboard">
      {/* Duty Banner */}
      <section className="ac-int-duty-banner" aria-label="Interpreter Duty Status Summary">
        <div className="ac-int-duty-banner__left">
          <div className="ac-int-duty-banner__title">
            <span>{profile.full_name}</span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: 'rgba(255,255,255,0.2)',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {profile.active_status}
            </span>
          </div>
          <div className="ac-int-duty-banner__meta">
            <span>Shift: {profile.shift_hours}</span>
            <span>Station: {profile.duty_location}</span>
            <span>Specialty: {profile.certification_level}</span>
          </div>
        </div>
        <div className="ac-int-duty-banner__actions">
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate('/interpreter/availability')}
          >
            Manage Availability
          </Button>
        </div>
      </section>

      {/* Action Notification Alert */}
      {actionFeedback && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #6ee7b7',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
          }}
          role="status"
        >
          <span>✓ {actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#065f46',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <section className="ac-int-metrics-grid" aria-label="Shift Metrics">
        <div className="ac-int-metric-card">
          <span className="ac-int-metric-card__header">Pending Dispatch Requests</span>
          <span className="ac-int-metric-card__value">
            {summary.pending_requests_count}
          </span>
          <span className="ac-int-metric-card__subtext">Awaiting your response</span>
        </div>
        <div className="ac-int-metric-card">
          <span className="ac-int-metric-card__header">Scheduled Assignments</span>
          <span className="ac-int-metric-card__value">
            {summary.today_assignments_count}
          </span>
          <span className="ac-int-metric-card__subtext">Confirmed on today's roster</span>
        </div>
        <div className="ac-int-metric-card">
          <span className="ac-int-metric-card__header">Completed Today</span>
          <span className="ac-int-metric-card__value">
            {summary.completed_today_count}
          </span>
          <span className="ac-int-metric-card__subtext">Interpreted sessions completed</span>
        </div>
        <div className="ac-int-metric-card">
          <span className="ac-int-metric-card__header">Primary Mode</span>
          <span
            className="ac-int-metric-card__value"
            style={{ fontSize: '1.25rem', color: '#0f766e', paddingTop: '4px' }}
          >
            ISL + Tele-ISL
          </span>
          <span className="ac-int-metric-card__subtext">In-person and remote VRI ready</span>
        </div>
      </section>

      {/* Next Upcoming Assignment Hero */}
      {next_assignment && (
        <section className="ac-int-hero-card" aria-label="Next Imminent Assignment">
          <div className="ac-int-hero-card__content">
            <div className="ac-int-hero-card__pill">
              <span>Next Upcoming Assignment</span>
            </div>
            <h2 className="ac-int-hero-card__title">
              {next_assignment.appointment_time} — {next_assignment.patient_name} (
              {next_assignment.department})
            </h2>
            <div className="ac-int-hero-card__details">
              <span>
                <strong>Doctor:</strong> {next_assignment.doctor_name}
              </span>
              <span>
                <strong>Location:</strong> {next_assignment.location}
              </span>
              <span>
                <strong>Modality:</strong>{' '}
                {next_assignment.modality === 'REMOTE' ? 'Remote Tele-ISL' : 'In-Person'}
              </span>
              <span>
                <strong>MRN:</strong> {next_assignment.patient_mrn}
              </span>
            </div>
            {next_assignment.meeting_point && (
              <div style={{ fontSize: '0.8125rem', color: '#0f766e', marginTop: '4px' }}>
                📍 <strong>Meeting Point:</strong> {next_assignment.meeting_point}
              </div>
            )}
          </div>
          <div className="ac-int-hero-card__actions">
            {next_assignment.modality === 'REMOTE' && next_assignment.video_session_id ? (
              <Button
                variant="primary"
                size="medium"
                onClick={() =>
                  navigate(`/interpreter/session/${next_assignment.video_session_id}`)
                }
              >
                Launch Remote Session
              </Button>
            ) : (
              <Button
                variant="primary"
                size="medium"
                onClick={() => navigate('/interpreter/assignments')}
              >
                View Assignment
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Two-Column Section: Pending Requests & Today's Schedule */}
      <div className="ac-int-grid-columns">
        {/* Left Column: Incoming Dispatch Requests */}
        <div className="ac-int-panel">
          <div className="ac-int-panel__header">
            <h3 className="ac-int-panel__title">Incoming Dispatch Requests</h3>
            <Link
              to="/interpreter/requests"
              style={{ fontSize: '0.875rem', fontWeight: 600 }}
            >
              View All ({recent_requests.length}) →
            </Link>
          </div>

          <div className="ac-int-notice-callout">
            <span>ℹ️</span>
            <span>
              <strong>Coordination Invariant:</strong> Accepting a request registers
              willingness. Staff coordinator verifies room schedule and issues final
              assignment.
            </span>
          </div>

          <div className="ac-int-list">
            {recent_requests.length === 0 ? (
              <div className="ac-int-empty-state">No incoming requests at this time.</div>
            ) : (
              recent_requests.map((req) => {
                const isUrgent = req.urgency === 'URGENT';
                const isAccepted = req.response_status === 'ACCEPTED';
                const isDeclined = req.response_status === 'DECLINED';

                return (
                  <div
                    key={req.id}
                    className={`ac-int-item-card ${
                      isUrgent ? 'ac-int-item-card--urgent' : ''
                    }`}
                  >
                    <div className="ac-int-item-card__top">
                      <div>
                        <h4 className="ac-int-item-card__title">
                          {req.patient_name} — {req.department}
                        </h4>
                        <div className="ac-int-item-card__meta">
                          <span>🕒 {req.appointment_time}</span>
                          <span>📍 {req.location}</span>
                          <span>👨‍⚕️ {req.doctor_name}</span>
                        </div>
                      </div>
                      <div>
                        {isAccepted ? (
                          <StatusBadge status="ready" label="Accepted (Pending Staff)" />
                        ) : isDeclined ? (
                          <StatusBadge status="cancelled" label="Declined" />
                        ) : isUrgent ? (
                          <StatusBadge status="escalated" label="Urgent Backup" />
                        ) : (
                          <StatusBadge status="pending" label="Pending Response" />
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-on-surface-variant)',
                          margin: 0,
                        }}
                      >
                        {req.notes}
                      </p>
                    )}

                    <div className="ac-int-item-card__footer">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          className={`ac-int-pill-info ${
                            req.modality === 'REMOTE' ? 'ac-int-pill-info--remote' : ''
                          }`}
                        >
                          {req.modality === 'REMOTE' ? 'Remote VRI' : 'In-Person'}
                        </span>
                        <span className="ac-int-pill-info">{req.communication_type}</span>
                        <span className="ac-int-pill-info">Priority: {req.routing_mode}</span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => navigate(`/interpreter/requests/${req.id}`)}
                        >
                          Details
                        </Button>
                        {!isAccepted && !isDeclined && (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleQuickAccept(req)}
                          >
                            Accept
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Confirmed Assignments */}
        <div className="ac-int-panel">
          <div className="ac-int-panel__header">
            <h3 className="ac-int-panel__title">Today's Confirmed Assignments</h3>
            <Link
              to="/interpreter/assignments"
              style={{ fontSize: '0.875rem', fontWeight: 600 }}
            >
              View Roster ({today_assignments.length}) →
            </Link>
          </div>

          <div className="ac-int-list">
            {today_assignments.length === 0 ? (
              <div className="ac-int-empty-state">No assignments scheduled for today.</div>
            ) : (
              today_assignments.map((assignment) => {
                const isRemote = assignment.modality === 'REMOTE';

                return (
                  <div key={assignment.id} className="ac-int-item-card">
                    <div className="ac-int-item-card__top">
                      <div>
                        <h4 className="ac-int-item-card__title">
                          {assignment.patient_name} ({assignment.patient_mrn})
                        </h4>
                        <div className="ac-int-item-card__meta">
                          <span>🕒 {assignment.appointment_time}</span>
                          <span>🏥 {assignment.department}</span>
                          <span>📍 {assignment.location}</span>
                        </div>
                      </div>
                      <div>
                        {assignment.status === 'ASSIGNED' ? (
                          <StatusBadge status="confirmed" label="Confirmed" />
                        ) : assignment.status === 'CHECKED_IN' ? (
                          <StatusBadge status="checked_in" label="Checked In" />
                        ) : assignment.status === 'COMPLETED' ? (
                          <StatusBadge status="ready" label="Completed" />
                        ) : assignment.status === 'CANCELLED' ? (
                          <StatusBadge status="cancelled" label="Cancelled" />
                        ) : (
                          <StatusBadge status="info" label={assignment.status} />
                        )}
                      </div>
                    </div>

                    {assignment.patient_accessibility_notes && (
                      <p
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-secondary)',
                          margin: 0,
                          backgroundColor: 'var(--color-surface-low)',
                          padding: '6px 10px',
                          borderRadius: '4px',
                        }}
                      >
                        ♿ {assignment.patient_accessibility_notes}
                      </p>
                    )}

                    <div className="ac-int-item-card__footer">
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span
                          className={`ac-int-pill-info ${
                            isRemote ? 'ac-int-pill-info--remote' : ''
                          }`}
                        >
                          {isRemote ? 'Remote Tele-ISL' : 'In-Person'}
                        </span>
                        <span className="ac-int-pill-info">
                          Staff: {assignment.staff_contact || 'OPD Desk'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isRemote && assignment.video_session_id ? (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() =>
                              navigate(`/interpreter/session/${assignment.video_session_id}`)
                            }
                          >
                            Enter Session
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => navigate('/interpreter/assignments')}
                          >
                            Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
