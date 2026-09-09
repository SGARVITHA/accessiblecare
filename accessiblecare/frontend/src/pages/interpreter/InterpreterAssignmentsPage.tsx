import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type {
  InterpreterAssignment,
  AssignmentCoordinationStatus,
} from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterAssignmentsPage.css';

export default function InterpreterAssignmentsPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<InterpreterAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    let active = true;
    interpreterService.getAssignments().then((data) => {
      if (active) {
        setAssignments(data);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleUpdateStatus = async (
    id: string,
    status: AssignmentCoordinationStatus,
    reason?: string
  ) => {
    try {
      const res = await interpreterService.updateAssignmentStatus(id, status, reason);
      setFeedback(res.message);
      setCancellingId(null);
      setCancelReason('');
      const updated = await interpreterService.getAssignments();
      setAssignments(updated);
    } catch {
      setFeedback('Failed to update assignment status.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Loading confirmed assignments...</p>
      </div>
    );
  }

  return (
    <div className="ac-int-assignments-page">
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px 0' }}>
          Confirmed Interpreter Assignments
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Manage your scheduled in-person and remote clinical interpretation sessions.
        </p>
      </div>

      {feedback && (
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
          <span>✓ {feedback}</span>
          <button
            onClick={() => setFeedback(null)}
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

      <div className="ac-int-assignments-list">
        {assignments.length === 0 ? (
          <div
            style={{
              padding: '3rem',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface-lowest)',
              borderRadius: '8px',
              border: '1px solid var(--color-outline-variant)',
            }}
          >
            <p style={{ color: 'var(--color-outline)', margin: 0 }}>
              No confirmed assignments at this time.
            </p>
          </div>
        ) : (
          assignments.map((asn) => {
            const isRemote = asn.modality === 'REMOTE';
            const isCancelled = asn.status === 'CANCELLED';
            const isCompleted = asn.status === 'COMPLETED';
            const isCheckedIn = asn.status === 'CHECKED_IN';

            return (
              <article
                key={asn.id}
                className={`ac-int-assignment-card ${
                  isCancelled
                    ? 'ac-int-assignment-card--cancelled'
                    : isRemote
                    ? 'ac-int-assignment-card--remote'
                    : 'ac-int-assignment-card--in-person'
                }`}
              >
                <div className="ac-int-assignment-card__header">
                  <div>
                    <h2 className="ac-int-assignment-card__title">
                      {asn.patient_name} — {asn.department}
                    </h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                      Assignment ID: <strong>{asn.id}</strong> • Encounter Ref: {asn.appointment_id}{' '}
                      • MRN: {asn.patient_mrn}
                    </div>
                  </div>

                  <div>
                    {asn.status === 'ASSIGNED' ? (
                      <StatusBadge status="confirmed" label="Confirmed" />
                    ) : asn.status === 'CHECKED_IN' ? (
                      <StatusBadge status="checked_in" label="Checked In" />
                    ) : asn.status === 'COMPLETED' ? (
                      <StatusBadge status="ready" label="Completed" />
                    ) : asn.status === 'CANCELLED' ? (
                      <StatusBadge status="cancelled" label="Cancelled (Escalated)" />
                    ) : (
                      <StatusBadge status="info" label={asn.status} />
                    )}
                  </div>
                </div>

                <div className="ac-int-assignment-card__grid">
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Scheduled Time</span>
                    <span className="ac-int-field-val">
                      {asn.date}, {asn.appointment_time}
                    </span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Modality</span>
                    <span className="ac-int-field-val">
                      {isRemote ? 'Remote VRI (Tele-ISL)' : 'In-Person Presence'}
                    </span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Physician</span>
                    <span className="ac-int-field-val">{asn.doctor_name}</span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Location / Station</span>
                    <span className="ac-int-field-val">{asn.location}</span>
                  </div>
                </div>

                {asn.meeting_point && (
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-surface-low)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                    }}
                  >
                    📍 <strong>Meeting Point / Check-in Desk:</strong> {asn.meeting_point}
                  </div>
                )}

                {asn.patient_accessibility_notes && (
                  <div
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--color-on-surface)',
                      backgroundColor: '#f0fdfa',
                      borderLeft: '3px solid #0f766e',
                      padding: '8px 12px',
                      borderRadius: '4px',
                    }}
                  >
                    <strong>Accessibility Requirements:</strong> {asn.patient_accessibility_notes}
                  </div>
                )}

                {asn.clinical_notes && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}>
                    <strong>Clinical Context:</strong> {asn.clinical_notes}
                  </div>
                )}

                {/* Inline Cancellation Drawer */}
                {cancellingId === asn.id && (
                  <div className="ac-int-cancel-box">
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: '#991b1b',
                      }}
                    >
                      Workflow-Controlled Cancellation Notice
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#7f1d1d' }}>
                      Cancelling this assignment will automatically re-queue the encounter into the
                      staff dispatch pool for urgent backup interpreter reassignment.
                    </p>
                    <input
                      type="text"
                      aria-label="Reason for cancellation"
                      placeholder="Reason for cancellation (e.g., medical emergency, shift conflict)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #fca5a5',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          setCancellingId(null);
                          setCancelReason('');
                        }}
                      >
                        Keep Assignment
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() =>
                          handleUpdateStatus(
                            asn.id,
                            'CANCELLED',
                            cancelReason || 'Interpreter unavailable'
                          )
                        }
                      >
                        Confirm Cancellation & Notify Staff
                      </Button>
                    </div>
                  </div>
                )}

                <div className="ac-int-assignment-card__footer">
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}>
                    Coordination Contact: <strong>{asn.staff_contact || 'OPD Dispatch'}</strong>
                  </div>

                  {!isCancelled && !isCompleted && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Check-In Action */}
                      {!isCheckedIn && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleUpdateStatus(asn.id, 'CHECKED_IN')}
                        >
                          Check In On-Site
                        </Button>
                      )}

                      {/* Remote VRI Session Action */}
                      {isRemote && asn.video_session_id && (
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => navigate(`/interpreter/session/${asn.video_session_id}`)}
                        >
                          Launch Remote Session (VRI)
                        </Button>
                      )}

                      {/* Complete Session Action */}
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => handleUpdateStatus(asn.id, 'COMPLETED')}
                      >
                        Mark Completed
                      </Button>

                      {/* Cancel Action */}
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setCancellingId(asn.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
