import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type { InterpreterIncomingRequest } from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterRequestDetailPage.css';

export default function InterpreterRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<InterpreterIncomingRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    interpreterService.getRequestById(id || '').then((data) => {
      if (active) {
        setRequest(data || null);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  const handleAction = async (action: 'ACCEPT' | 'DECLINE') => {
    if (!request) return;
    try {
      const res = await interpreterService.respondToRequest(request.id, action);
      setRequest(res.request);
      setFeedback(res.message);
    } catch {
      setFeedback('An error occurred updating the request.');
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Request Not Found</h2>
        <p>The requested dispatch record could not be found.</p>
        <Button variant="secondary" size="medium" onClick={() => navigate('/interpreter/requests')}>
          Back to Requests
        </Button>
      </div>
    );
  }

  const isAccepted = request.response_status === 'ACCEPTED';
  const isDeclined = request.response_status === 'DECLINED';

  return (
    <div className="ac-int-detail-page">
      <div>
        <Link
          to="/interpreter/requests"
          style={{ fontSize: '0.875rem', fontWeight: 600, display: 'inline-flex', gap: '4px' }}
        >
          ← Back to Dispatch Requests
        </Link>
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

      {/* Coordination Invariant Notice */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#1e40af',
          fontSize: '0.875rem',
        }}
      >
        <strong>Policy Reminder:</strong> Interpreter acceptance sets response status to{' '}
        <code>ACCEPTED</code>. Assignment status remains <code>UNASSIGNED</code> until confirmed by
        clinical scheduling staff.
      </div>

      <article className="ac-int-detail-card">
        <div className="ac-int-detail-card__header">
          <div>
            <h1 className="ac-int-detail-title">{request.patient_name}</h1>
            <div className="ac-int-detail-sub">
              Request Ref: <strong>{request.id}</strong> • MRN: {request.patient_mrn} • Clinical
              Encounter: {request.appointment_id}
            </div>
          </div>
          <div>
            {isAccepted ? (
              <StatusBadge status="ready" label="Accepted (Awaiting Staff)" />
            ) : isDeclined ? (
              <StatusBadge status="cancelled" label="Declined" />
            ) : request.urgency === 'URGENT' ? (
              <StatusBadge status="escalated" label="Urgent Backup" />
            ) : (
              <StatusBadge status="pending" label="Pending Response" />
            )}
          </div>
        </div>

        <div className="ac-int-detail-sections">
          {/* Clinical & Encounter Context */}
          <div className="ac-int-detail-group">
            <h2 className="ac-int-group-title">Encounter & Location Details</h2>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Department</span>
              <span className="ac-int-detail-value">{request.department}</span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Consulting Physician</span>
              <span className="ac-int-detail-value">{request.doctor_name}</span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Scheduled Window</span>
              <span className="ac-int-detail-value">
                {request.date}, {request.appointment_time}
              </span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Room / Station</span>
              <span className="ac-int-detail-value">{request.location}</span>
            </div>
          </div>

          {/* Dispatch & Language Parameters */}
          <div className="ac-int-detail-group">
            <h2 className="ac-int-group-title">Dispatch & Accessibility Parameters</h2>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Modality</span>
              <span className="ac-int-detail-value">
                {request.modality === 'REMOTE' ? 'Remote Tele-ISL (VRI)' : 'In-Person Presence'}
              </span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Communication Mode</span>
              <span className="ac-int-detail-value">{request.communication_type}</span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Routing Priority</span>
              <span className="ac-int-detail-value">{request.routing_mode} Dispatch</span>
            </div>
            <div className="ac-int-detail-row">
              <span className="ac-int-detail-label">Assignment State</span>
              <span className="ac-int-detail-value">{request.assignment_status}</span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        {request.notes && (
          <div style={{ backgroundColor: 'var(--color-surface-low)', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--color-primary)' }}>
              Clinical Accessibility Notes & Guidance
            </h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface)' }}>
              {request.notes}
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="ac-int-actions-bar">
          {!isAccepted && !isDeclined ? (
            <>
              <Button variant="secondary" size="medium" onClick={() => handleAction('DECLINE')}>
                Decline Request
              </Button>
              <Button variant="primary" size="medium" onClick={() => handleAction('ACCEPT')}>
                Accept Request
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="medium" onClick={() => navigate('/interpreter/requests')}>
              Return to Requests List
            </Button>
          )}
        </div>
      </article>
    </div>
  );
}
