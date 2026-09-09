import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type {
  InterpreterIncomingRequest,
  RequestModality,
} from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterRequestsPage.css';

export default function InterpreterRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<InterpreterIncomingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'DECLINED'>('ALL');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | RequestModality>('ALL');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    interpreterService.getRequests().then((data) => {
      if (active) {
        setRequests(data);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRespond = async (id: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      const result = await interpreterService.respondToRequest(id, action);
      setFeedbackMessage(result.message);
      const updated = await interpreterService.getRequests();
      setRequests(updated);
    } catch {
      setFeedbackMessage('Failed to update request status.');
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === 'PENDING' && req.response_status !== 'PENDING') return false;
    if (activeTab === 'ACCEPTED' && req.response_status !== 'ACCEPTED') return false;
    if (activeTab === 'DECLINED' && req.response_status !== 'DECLINED') return false;
    if (modalityFilter !== 'ALL' && req.modality !== modalityFilter) return false;
    return true;
  });

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Loading dispatch requests...</p>
      </div>
    );
  }

  return (
    <div className="ac-int-requests-page">
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px 0' }}>
          Interpreter Dispatch Requests
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Review incoming automated and staff-routed interpretation requests.
        </p>
      </div>

      {/* Critical Workflow Invariant Alert Banner */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '14px 18px',
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>⚖️</span>
        <div>
          <strong>Important Coordination Invariant: ACCEPTED ≠ ASSIGNED.</strong>
          <span style={{ display: 'block', marginTop: '2px', color: '#1e3a8a' }}>
            Accepting an interpretation request confirms your willingness and schedule availability.
            Official assignment is verified and finalized by the hospital clinical coordination
            desk.
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#166534',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.875rem',
          }}
          role="status"
        >
          <span>✓ {feedbackMessage}</span>
          <button
            onClick={() => setFeedbackMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#166534',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="ac-int-filter-bar">
        <div className="ac-int-filter-tabs">
          <button
            className={`ac-int-filter-btn ${activeTab === 'ALL' ? 'ac-int-filter-btn--active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All ({requests.length})
          </button>
          <button
            className={`ac-int-filter-btn ${
              activeTab === 'PENDING' ? 'ac-int-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('PENDING')}
          >
            Pending ({requests.filter((r) => r.response_status === 'PENDING').length})
          </button>
          <button
            className={`ac-int-filter-btn ${
              activeTab === 'ACCEPTED' ? 'ac-int-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('ACCEPTED')}
          >
            Accepted ({requests.filter((r) => r.response_status === 'ACCEPTED').length})
          </button>
          <button
            className={`ac-int-filter-btn ${
              activeTab === 'DECLINED' ? 'ac-int-filter-btn--active' : ''
            }`}
            onClick={() => setActiveTab('DECLINED')}
          >
            Declined ({requests.filter((r) => r.response_status === 'DECLINED').length})
          </button>
        </div>

        <div className="ac-int-filter-controls">
          <label
            htmlFor="modality-filter"
            style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}
          >
            Modality:
          </label>
          <select
            id="modality-filter"
            className="ac-int-select"
            value={modalityFilter}
            onChange={(e) => setModalityFilter(e.target.value as 'ALL' | RequestModality)}
          >
            <option value="ALL">All Modalities</option>
            <option value="IN_PERSON">In-Person Only</option>
            <option value="REMOTE">Remote VRI Only</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="ac-int-requests-list">
        {filteredRequests.length === 0 ? (
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
              No requests match the selected filters.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isUrgent = req.urgency === 'URGENT';
            const isAccepted = req.response_status === 'ACCEPTED';
            const isDeclined = req.response_status === 'DECLINED';

            return (
              <article
                key={req.id}
                className={`ac-int-request-card ${isUrgent ? 'ac-int-request-card--urgent' : ''}`}
              >
                <div className="ac-int-request-card__header">
                  <div>
                    <h2 className="ac-int-request-card__patient-name">
                      {req.patient_name} — {req.department}
                    </h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
                      Request ID: <strong>{req.id}</strong> • MRN: {req.patient_mrn} •
                      Appointment Ref: {req.appointment_id}
                    </div>
                  </div>

                  <div className="ac-int-request-card__badges">
                    {req.routing_mode === 'BACKUP' && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        BACKUP ROUTE
                      </span>
                    )}
                    {isAccepted ? (
                      <StatusBadge status="ready" label="Accepted (Awaiting Staff)" />
                    ) : isDeclined ? (
                      <StatusBadge status="cancelled" label="Declined" />
                    ) : isUrgent ? (
                      <StatusBadge status="escalated" label="Urgent Dispatch" />
                    ) : (
                      <StatusBadge status="pending" label="Pending Response" />
                    )}
                  </div>
                </div>

                <div className="ac-int-request-card__grid">
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Scheduled Time</span>
                    <span className="ac-int-field-val">
                      {req.date}, {req.appointment_time}
                    </span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Clinic Location</span>
                    <span className="ac-int-field-val">{req.location}</span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Doctor</span>
                    <span className="ac-int-field-val">{req.doctor_name}</span>
                  </div>
                  <div className="ac-int-field-item">
                    <span className="ac-int-field-label">Language Mode</span>
                    <span className="ac-int-field-val">
                      {req.communication_type} ({req.modality === 'REMOTE' ? 'Remote' : 'In-Person'})
                    </span>
                  </div>
                </div>

                {req.notes && (
                  <p className="ac-int-request-card__notes">
                    <strong>Patient Note:</strong> {req.notes}
                  </p>
                )}

                <div className="ac-int-request-card__actions">
                  <div>
                    {!isAccepted && !isDeclined && (
                      <div className="ac-int-timer-badge">
                        <span>⏳</span>
                        <span>Auto-escalates in ~{req.expires_in_minutes} mins</span>
                      </div>
                    )}
                    {isAccepted && (
                      <span style={{ fontSize: '0.8125rem', color: '#047857', fontWeight: 600 }}>
                        ✓ Accepted at {req.received_at}. Status remains UNASSIGNED until confirmed by
                        staff coordinator.
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => navigate(`/interpreter/requests/${req.id}`)}
                    >
                      View Details
                    </Button>
                    {!isAccepted && !isDeclined && (
                      <>
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => handleRespond(req.id, 'DECLINE')}
                        >
                          Decline
                        </Button>
                        <Button
                          variant="primary"
                          size="small"
                          onClick={() => handleRespond(req.id, 'ACCEPT')}
                        >
                          Accept Request
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
