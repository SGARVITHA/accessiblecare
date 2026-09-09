import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { interpreterService } from '../../services/interpreterService';
import type {
  InterpreterProfile,
  InterpreterAssignment,
  AvailabilitySlot,
  InterpreterDutyStatus,
} from '../../types/interpreter';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import './InterpreterAvailabilityPage.css';

export default function InterpreterAvailabilityPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InterpreterProfile | null>(null);
  const [assignments, setAssignments] = useState<InterpreterAssignment[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Availability Editor Form State
  const [targetDate, setTargetDate] = useState('Tomorrow (Sep 11)');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('04:30 PM');
  const [routingMode, setRoutingMode] = useState<'PRIMARY' | 'BACKUP' | 'OFF'>('PRIMARY');

  useEffect(() => {
    let active = true;
    Promise.all([
      interpreterService.getProfile(),
      interpreterService.getAssignments(),
      interpreterService.getAvailabilitySlots(),
    ]).then(([p, a, s]) => {
      if (active) {
        setProfile(p);
        setAssignments(a);
        setSlots(s);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDutyStatusChange = async (newStatus: InterpreterDutyStatus) => {
    const updated = await interpreterService.updateDutyStatus(newStatus);
    setProfile(updated);
    setFeedback(`Duty status updated to ${newStatus}. Dispatch pool notified.`);
  };

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedSlot = await interpreterService.updateAvailabilitySlot({
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        routing_mode: routingMode,
      });
      const newSlots = await interpreterService.getAvailabilitySlots();
      setSlots(newSlots);
      setFeedback(`Availability for ${updatedSlot.date} saved successfully.`);
    } catch {
      setFeedback('Failed to update availability schedule.');
    }
  };

  if (isLoading || !profile) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p>Loading Interpreter Availability & Schedule...</p>
      </div>
    );
  }

  return (
    <div className="ac-int-avail-page">
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px 0' }}>
          Interpreter Availability & Schedule
        </h1>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0 }}>
          Manage your live dispatch readiness, duty hours, roster shifts, and institutional SLAs.
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

      {/* SECTION 1: Current Availability Status */}
      <section className="ac-int-avail-section" aria-labelledby="sec1-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec1-title" className="ac-int-avail-section__title">
            1. Current Availability Status
          </h2>
          <div>
            {profile.active_status === 'AVAILABLE' ? (
              <StatusBadge status="ready" label="Available for Dispatch" />
            ) : profile.active_status === 'ON_CALL' ? (
              <StatusBadge status="pending" label="On-Call (Backup Only)" />
            ) : profile.active_status === 'BUSY' ? (
              <StatusBadge status="action_required" label="Busy in Session" />
            ) : (
              <StatusBadge status="unavailable" label="Off Duty" />
            )}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-on-surface-variant)' }}>
          Your current real-time readiness governs whether the automated dispatch engine routes
          urgent encounter requests directly to you.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            variant={profile.active_status === 'AVAILABLE' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDutyStatusChange('AVAILABLE')}
          >
            ● Available (Primary Dispatch)
          </Button>
          <Button
            variant={profile.active_status === 'ON_CALL' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDutyStatusChange('ON_CALL')}
          >
            ◐ On-Call (Backup Fallback)
          </Button>
          <Button
            variant={profile.active_status === 'BUSY' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDutyStatusChange('BUSY')}
          >
            ▲ Busy (Active Encounter)
          </Button>
          <Button
            variant={profile.active_status === 'OFF_DUTY' ? 'primary' : 'secondary'}
            size="small"
            onClick={() => handleDutyStatusChange('OFF_DUTY')}
          >
            ✕ Off Duty
          </Button>
        </div>
      </section>

      {/* SECTION 2: Today's Availability Hours */}
      <section className="ac-int-avail-section" aria-labelledby="sec2-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec2-title" className="ac-int-avail-section__title">
            2. Today's Availability Hours
          </h2>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            Scheduled Shift: 08:00 AM – 04:30 PM
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            backgroundColor: 'var(--color-surface-low)',
            padding: '16px',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 600 }}>
              DUTY HOURS
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {profile.shift_hours}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 600 }}>
              PRIMARY DISPATCH LOCATION
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {profile.duty_location}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 600 }}>
              QUALIFICATION CREDENTIAL
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-on-surface)' }}>
              {profile.certification_level}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: Today's Schedule / Timeline */}
      <section className="ac-int-avail-section" aria-labelledby="sec3-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec3-title" className="ac-int-avail-section__title">
            3. Today's Schedule & Timeline
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}>
            4 time blocks mapped
          </span>
        </div>
        <div className="ac-int-timeline">
          <div className="ac-int-timeline-item">
            <span className="ac-int-timeline-time">08:00 AM – 10:30 AM</span>
            <span className="ac-int-timeline-desc">
              <strong>Standby & On-Site Prep</strong> — Available for emergency or walk-in dispatch
              in West Wing.
            </span>
          </div>

          <div className="ac-int-timeline-item ac-int-timeline-item--booked">
            <span className="ac-int-timeline-time">10:30 AM – 11:00 AM [CONFIRMED]</span>
            <span className="ac-int-timeline-desc">
              <strong>ENT Clinic Consultation (A501)</strong> — Patient: Rohan Verma (P1024),
              Doctor: Dr. Sharma, Location: Building B, Room 204. (In-Person ISL)
            </span>
          </div>

          <div className="ac-int-timeline-item ac-int-timeline-item--remote">
            <span className="ac-int-timeline-time">11:30 AM – 12:00 PM [CONFIRMED]</span>
            <span className="ac-int-timeline-desc">
              <strong>Ophthalmology Tele-ISL Follow-up (A502)</strong> — Patient: Devika Pillai
              (P1025), Doctor: Dr. Varma. Station: Tele-ISL Pod 2 Console. (Remote VRI)
            </span>
          </div>

          <div className="ac-int-timeline-item">
            <span className="ac-int-timeline-time">12:00 PM – 04:30 PM</span>
            <span className="ac-int-timeline-desc">
              <strong>Available Duty Window</strong> — Open for afternoon clinic appointments or
              urgent fallback assignments.
            </span>
          </div>
        </div>
      </section>

      {/* SECTION 4: Confirmed Assignments */}
      <section className="ac-int-avail-section" aria-labelledby="sec4-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec4-title" className="ac-int-avail-section__title">
            4. Confirmed Assignments
          </h2>
          <Button
            variant="secondary"
            size="small"
            onClick={() => navigate('/interpreter/assignments')}
          >
            Manage All Assignments →
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {assignments.map((asn) => (
            <div
              key={asn.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--color-surface-low)',
                borderRadius: '8px',
                border: '1px solid var(--color-surface-high)',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.9375rem' }}>
                  {asn.patient_name} ({asn.patient_mrn})
                </strong>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)' }}>
                  {asn.appointment_time} • {asn.department} • {asn.location} •{' '}
                  {asn.modality === 'REMOTE' ? 'Remote VRI' : 'In-Person'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge
                  status={asn.status === 'ASSIGNED' ? 'confirmed' : 'ready'}
                  label={asn.status}
                />
                {asn.modality === 'REMOTE' && asn.video_session_id && (
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => navigate(`/interpreter/session/${asn.video_session_id}`)}
                  >
                    VRI Session
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: Availability Editor */}
      <section className="ac-int-avail-section" aria-labelledby="sec5-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec5-title" className="ac-int-avail-section__title">
            5. Availability Editor
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}>
            Submit schedule updates to central coordination
          </span>
        </div>
        <form onSubmit={handleSaveAvailability} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="ac-int-form-grid">
            <div className="ac-int-form-field">
              <label htmlFor="avail-date">Target Date</label>
              <select
                id="avail-date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              >
                {slots.map((s) => (
                  <option key={s.id} value={s.date}>
                    {s.date} ({s.day_of_week})
                  </option>
                ))}
              </select>
            </div>

            <div className="ac-int-form-field">
              <label htmlFor="avail-start">Start Time</label>
              <input
                id="avail-start"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="08:00 AM"
              />
            </div>

            <div className="ac-int-form-field">
              <label htmlFor="avail-end">End Time</label>
              <input
                id="avail-end"
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="04:30 PM"
              />
            </div>

            <div className="ac-int-form-field">
              <label htmlFor="avail-mode">Routing Mode</label>
              <select
                id="avail-mode"
                value={routingMode}
                onChange={(e) =>
                  setRoutingMode(e.target.value as 'PRIMARY' | 'BACKUP' | 'OFF')
                }
              >
                <option value="PRIMARY">Primary Dispatch Roster</option>
                <option value="BACKUP">Backup Escalation Only</option>
                <option value="OFF">Off Duty / Unavailable</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="medium">
              Save Schedule Changes
            </Button>
          </div>
        </form>
      </section>

      {/* SECTION 6: Upcoming Availability */}
      <section className="ac-int-avail-section" aria-labelledby="sec6-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec6-title" className="ac-int-avail-section__title">
            6. Upcoming Availability Roster (7 Days)
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-outline)' }}>
            Rolling weekly projection
          </span>
        </div>
        <div className="ac-int-table-wrap">
          <table className="ac-int-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Shift Hours</th>
                <th>Routing Mode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <td style={{ fontWeight: 600 }}>{slot.date}</td>
                  <td>{slot.day_of_week}</td>
                  <td>
                    {slot.start_time} – {slot.end_time}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          slot.routing_mode === 'PRIMARY'
                            ? '#ccfbf1'
                            : slot.routing_mode === 'BACKUP'
                            ? '#fef3c7'
                            : '#f1f5f9',
                        color:
                          slot.routing_mode === 'PRIMARY'
                            ? '#0f766e'
                            : slot.routing_mode === 'BACKUP'
                            ? '#92400e'
                            : '#475569',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                      }}
                    >
                      {slot.routing_mode}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      status={
                        slot.status === 'AVAILABLE'
                          ? 'ready'
                          : slot.status === 'PARTIALLY_BOOKED'
                          ? 'confirmed'
                          : slot.status === 'FULLY_BOOKED'
                          ? 'action_required'
                          : 'unavailable'
                      }
                      label={slot.status.replace('_', ' ')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 7: Accessibility & Coordination Policy Reminder */}
      <section className="ac-int-avail-section" aria-labelledby="sec7-title">
        <div className="ac-int-avail-section__header">
          <h2 id="sec7-title" className="ac-int-avail-section__title">
            7. Accessibility & Coordination Policy Reminder
          </h2>
          <span style={{ fontSize: '0.8125rem', color: '#0369a1', fontWeight: 600 }}>
            Standard Operating Procedure (SOP)
          </span>
        </div>
        <div className="ac-int-policy-box">
          <p style={{ margin: 0, fontWeight: 600 }}>
            Institutional Clinical Language Services Guidelines:
          </p>
          <ul>
            <li>
              <strong>Dispatch Acknowledgement SLA:</strong> Incoming dispatch requests must be
              acknowledged or responded to within <strong>15 minutes</strong> of receipt before
              cascading to the secondary backup pool.
            </li>
            <li>
              <strong>Modality Readiness:</strong> Certified interpreters assigned to remote VRI pods
              must ensure terminal camera, audio pass-through, and high-contrast video feeds are
              tested 10 minutes prior to session start.
            </li>
            <li>
              <strong>Notice of Cancellation:</strong> If an interpreter cannot fulfill an assigned
              session due to clinical emergency, cancellation must be submitted through the portal
              promptly to trigger automated staff backup dispatch.
            </li>
            <li>
              <strong>Confidentiality & Documentation:</strong> All ISL interpretations adhere to
              hospital patient privacy safeguards and medical translation ethics.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
