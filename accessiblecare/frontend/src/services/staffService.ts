/**
 * AccessibleCare Staff Operations Centralized Service Layer
 *
 * Implements deterministic demo workflows for staff coordination,
 * AI recommendation review, parallel dispatch, assignment confirmation,
 * cancellation, and fallback protocol simulation.
 */

import type {
  StaffDashboardData,
  StaffAppointmentSummary,
  AppointmentWorkspaceDetail,
  InterpreterCandidate,
  EscalationRecord,
  AuditTimelineEvent,
  RoutineMessage,
} from '../types/staff';

// Canonical Candidate Definitions
const CANDIDATE_ANITHA: InterpreterCandidate = {
  id: 'int_anitha_rajan',
  name: 'Anitha Rajan',
  badge_number: 'ISL-8831',
  language: 'Indian Sign Language (ISL)',
  mode: 'IN_PERSON',
  certification: 'Certified Medical ISL Interpreter (Level 3)',
  availability_window: 'Available (10:15 – 11:30 AM)',
  proximity_station: 'East Wing (Room A-104 proximity)',
  shift: '08:00 – 16:30',
  is_primary_recommendation: true,
  response_status: 'PENDING',
  assignment_status: 'UNASSIGNED',
};

const CANDIDATE_PRIYA: InterpreterCandidate = {
  id: 'int_priya_patel',
  name: 'Priya Patel',
  badge_number: 'TEL-4109',
  language: 'Indian Sign Language (ISL)',
  mode: 'REMOTE',
  certification: 'Certified Healthcare Tele-ISL Interpreter (Level 2)',
  availability_window: 'Available (10:00 – 11:30 AM)',
  proximity_station: 'Secure Tele-ISL Standby Hub',
  shift: '08:00 – 16:00',
  is_primary_recommendation: false,
  response_status: 'PENDING',
  assignment_status: 'UNASSIGNED',
};

const CANDIDATE_RAHUL: InterpreterCandidate = {
  id: 'int_rahul_varma',
  name: 'Rahul Varma',
  badge_number: 'ISL-9012',
  language: 'Indian Sign Language (ISL)',
  mode: 'IN_PERSON',
  certification: 'Certified Legal & Medical ISL Interpreter',
  availability_window: 'Unavailable during appointment window (10:30–11:00 AM)',
  proximity_station: 'West Clinic Block C (1.2 km away)',
  shift: '12:00 – 20:00',
  is_primary_recommendation: false,
  response_status: 'UNAVAILABLE',
  assignment_status: 'UNASSIGNED',
};

// Initial Roster of Appointments
const INITIAL_APPOINTMENTS: StaffAppointmentSummary[] = [
  {
    id: 'A501',
    patient_mrn: 'P1024',
    patient_name: 'Rohan',
    department: 'ENT / Otolaryngology',
    room: 'Room A-104',
    scheduled_time: 'Today, 10:30 – 11:00 AM',
    validated_language: 'Indian Sign Language (ISL)',
    preferred_mode: 'IN_PERSON',
    remote_accepted: true,
    visit_status: 'COORDINATING',
    interpreter_status_label: 'Approval Required',
    action_required: true,
    urgent_badge: 'Awaiting Staff Approval',
  },
  {
    id: 'A498',
    patient_mrn: 'P1018',
    patient_name: 'Aditi Nair',
    department: 'Audiology',
    room: 'Suite C-12',
    scheduled_time: 'Today, 11:00 – 11:45 AM',
    validated_language: 'Indian Sign Language (ISL)',
    preferred_mode: 'IN_PERSON',
    remote_accepted: true,
    visit_status: 'ESCALATED',
    interpreter_status_label: 'Fallback Required',
    action_required: true,
    urgent_badge: 'Interpreter Cancelled',
  },
  {
    id: 'A497',
    patient_mrn: 'P1009',
    patient_name: 'Sunil Mehta',
    department: 'Dental Surgery',
    room: 'Room B-202',
    scheduled_time: 'Today, 10:00 – 10:45 AM',
    validated_language: 'ISL + Live Captioning',
    preferred_mode: 'IN_PERSON',
    remote_accepted: false,
    visit_status: 'CHECKED_IN',
    interpreter_status_label: 'Confirmed (Anitha Rajan)',
    interpreter_name: 'Anitha Rajan',
    action_required: false,
  },
  {
    id: 'A505',
    patient_mrn: 'P1044',
    patient_name: 'Kavita Roy',
    department: 'Orthopedics',
    room: 'Room B-110',
    scheduled_time: 'Today, 11:15 – 11:45 AM',
    validated_language: 'Speech-to-Text (STT)',
    preferred_mode: 'REMOTE',
    remote_accepted: true,
    visit_status: 'PREFERENCES_CONFIRMED',
    interpreter_status_label: 'Display Tablet Assigned',
    action_required: false,
  },
  {
    id: 'A502',
    patient_mrn: 'P1031',
    patient_name: 'Devika Pillai',
    department: 'Ophthalmology',
    room: 'Room C-04',
    scheduled_time: 'Today, 11:30 AM – 12:00 PM',
    validated_language: 'ISL (Tele-ISL)',
    preferred_mode: 'REMOTE',
    remote_accepted: true,
    visit_status: 'INTERPRETER_CONFIRMED',
    interpreter_status_label: 'Confirmed (Priya Patel)',
    interpreter_name: 'Priya Patel',
    action_required: false,
  },
  {
    id: 'A509',
    patient_mrn: 'P1052',
    patient_name: 'Manish Kumar',
    department: 'Cardiology Clinic',
    room: 'West Clinic 3',
    scheduled_time: 'Today, 11:30 AM – 12:15 PM',
    validated_language: 'ISL',
    preferred_mode: 'IN_PERSON',
    remote_accepted: false,
    visit_status: 'INTERPRETER_CONFIRMED',
    interpreter_status_label: 'Confirmed (Rahul Varma)',
    interpreter_name: 'Rahul Varma',
    action_required: false,
  },
];

// Initial Escalations
const INITIAL_ESCALATIONS: EscalationRecord[] = [
  {
    id: 'ESC-892',
    appointment_id: 'A498',
    patient_mrn: 'P1018',
    patient_name: 'Aditi Nair',
    department: 'Audiology',
    scheduled_time: 'Today, 11:00 AM',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Assigned in-person interpreter cancelled 25m prior to appointment',
    reason: 'External agency interpreter unavailable due to emergency transit delay. Remote fallback stand-by available.',
    created_at: '10:02 AM',
    assigned_to: 'Elena Vance',
  },
  {
    id: 'ESC-887',
    appointment_id: 'A506',
    patient_mrn: 'P1049',
    patient_name: 'Vijay Joshi',
    department: 'Neurology OPD',
    scheduled_time: 'Today, 01:30 PM',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    summary: 'Specialized tactile sign language requirement requested for consultation',
    reason: 'Reviewing cross-hospital accredited tactile interpreter availability.',
    created_at: '09:15 AM',
    assigned_to: 'Elena Vance',
  },
];

// Initial Audit Timeline for A501
const INITIAL_TIMELINE_A501: AuditTimelineEvent[] = [
  {
    id: 'ev-1',
    timestamp: '09:40 AM',
    actor: 'Patient Portal',
    actor_role: 'Patient Portal',
    description: 'Patient Rohan (P1024) confirmed ISL and visual reception alert preferences',
    badge_variant: 'primary',
  },
  {
    id: 'ev-2',
    timestamp: '09:42 AM',
    actor: 'AI Orchestrator',
    actor_role: 'AI Engine',
    description: 'Synthesized Parallel Top 2 dispatch recommendation (Anitha Rajan + Priya Patel)',
    badge_variant: 'secondary',
  },
];

// Initial Routine Messages for A501
const INITIAL_MESSAGES_A501: RoutineMessage[] = [
  {
    id: 'msg-1',
    timestamp: '09:45 AM',
    sender_name: 'Elena Vance',
    sender_role: 'Staff Coordinator',
    recipient_target: 'ENT Reception Desk A-104',
    text: 'Visual reception alerts confirmed active for Patient P1024 arrival.',
  },
];

// Central Reactive State Store
class StaffStateStore {
  private appointments: StaffAppointmentSummary[] = JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS));
  private escalations: EscalationRecord[] = JSON.parse(JSON.stringify(INITIAL_ESCALATIONS));
  private candidatesA501: InterpreterCandidate[] = [
    JSON.parse(JSON.stringify(CANDIDATE_ANITHA)),
    JSON.parse(JSON.stringify(CANDIDATE_PRIYA)),
    JSON.parse(JSON.stringify(CANDIDATE_RAHUL)),
  ];
  private timelineA501: AuditTimelineEvent[] = JSON.parse(JSON.stringify(INITIAL_TIMELINE_A501));
  private messagesA501: RoutineMessage[] = JSON.parse(JSON.stringify(INITIAL_MESSAGES_A501));
  private assignedInterpreterA501?: InterpreterCandidate;
  private fallbackActiveA501: boolean = false;

  // Reset to initial state
  public reset(): void {
    this.appointments = JSON.parse(JSON.stringify(INITIAL_APPOINTMENTS));
    this.escalations = JSON.parse(JSON.stringify(INITIAL_ESCALATIONS));
    this.candidatesA501 = [
      JSON.parse(JSON.stringify(CANDIDATE_ANITHA)),
      JSON.parse(JSON.stringify(CANDIDATE_PRIYA)),
      JSON.parse(JSON.stringify(CANDIDATE_RAHUL)),
    ];
    this.timelineA501 = JSON.parse(JSON.stringify(INITIAL_TIMELINE_A501));
    this.messagesA501 = JSON.parse(JSON.stringify(INITIAL_MESSAGES_A501));
    this.assignedInterpreterA501 = undefined;
    this.fallbackActiveA501 = false;
  }

  public getDashboardData(): StaffDashboardData {
    const needsAttention = this.appointments.filter((a) => a.action_required);
    const confirmedCount = this.appointments.filter(
      (a) => a.visit_status === 'INTERPRETER_CONFIRMED' || a.visit_status === 'CHECKED_IN'
    ).length;
    const openEscalations = this.escalations.filter((e) => e.status !== 'RESOLVED').length;

    return {
      metrics: {
        total_accessibility_requests_today: this.appointments.length + 12,
        needs_attention_count: needsAttention.length,
        confirmed_sessions_count: confirmedCount + 10,
        open_escalations_count: openEscalations,
      },
      needs_attention: needsAttention,
      today_appointments: [...this.appointments],
    };
  }

  public getAppointments(filter?: string): StaffAppointmentSummary[] {
    if (!filter || filter === 'ALL') return [...this.appointments];
    if (filter === 'AWAITING_APPROVAL') {
      return this.appointments.filter((a) => a.action_required && a.visit_status === 'COORDINATING');
    }
    if (filter === 'CONFIRMED') {
      return this.appointments.filter((a) => a.visit_status === 'INTERPRETER_CONFIRMED');
    }
    if (filter === 'CHECKED_IN') {
      return this.appointments.filter((a) => a.visit_status === 'CHECKED_IN');
    }
    if (filter === 'ESCALATED') {
      return this.appointments.filter((a) => a.visit_status === 'ESCALATED');
    }
    return [...this.appointments];
  }

  public getWorkspace(appointmentId: string): AppointmentWorkspaceDetail | null {
    const appt = this.appointments.find((a) => a.id === appointmentId);
    if (!appt) return null;

    return {
      appointment: { ...appt },
      requirements: {
        language: appt.validated_language,
        interpreter_required: true,
        preferred_mode: appt.preferred_mode,
        remote_fallback_accepted: appt.remote_accepted,
        companion_present: false,
        visual_queue_alert: true,
        special_instructions: 'Requires visual callout on waiting room board and SMS text dispatch alert.',
      },
      ai_recommendation: {
        strategy: 'PARALLEL_TOP_2',
        strategy_name: 'Parallel Top 2 Dispatch',
        rationale:
          'Anitha Rajan matches the patient’s preferred in-person mode and appointment window with zero travel latency. Priya Patel provides an authenticated, immediate remote fallback standby.',
        policy_reference: 'Hospital Accessibility SOP v2.1 §4 (Remote Fallback Mandate)',
        governance_rule: 'AI Recommends. Staff Decides.',
        candidate_ids: ['int_anitha_rajan', 'int_priya_patel'],
        recommended_primary_id: 'int_anitha_rajan',
        recommended_fallback_id: 'int_priya_patel',
      },
      candidates: this.candidatesA501.map((c) => ({ ...c })),
      timeline: [...this.timelineA501],
      routine_messages: [...this.messagesA501],
      assigned_interpreter: this.assignedInterpreterA501
        ? { ...this.assignedInterpreterA501 }
        : undefined,
      fallback_active: this.fallbackActiveA501,
      fallback_recommendation: this.fallbackActiveA501
        ? {
            candidate: { ...this.candidatesA501[1] }, // Priya
            rationale:
              'Primary candidate Anitha Rajan has cancelled due to transit disruption. Standby candidate Priya Patel is logged in, authenticated on Tele-ISL Hub, and ready for immediate deployment.',
          }
        : undefined,
    };
  }

  public approveDispatch(appointmentId: string): void {
    if (appointmentId !== 'A501') return;

    // Anitha & Priya both accept (Parallel dispatch responses logged)
    this.candidatesA501[0].response_status = 'ACCEPTED';
    this.candidatesA501[0].response_timestamp = '09:47 AM';

    this.candidatesA501[1].response_status = 'ACCEPTED';
    this.candidatesA501[1].response_timestamp = '09:46 AM';

    // Update appointment summary
    const appt = this.appointments.find((a) => a.id === 'A501');
    if (appt) {
      appt.interpreter_status_label = 'Responses Logged (2 Accepted)';
      appt.urgent_badge = 'Awaiting Final Assignment';
    }

    // Add audit events
    this.timelineA501.push({
      id: `ev-${Date.now()}-1`,
      timestamp: '09:44 AM',
      actor: 'Elena Vance',
      actor_role: 'Staff Coordinator',
      description: 'Elena Vance approved Parallel Top 2 dispatch strategy',
      badge_variant: 'primary',
    });
    this.timelineA501.push({
      id: `ev-${Date.now()}-2`,
      timestamp: '09:46 AM',
      actor: 'Priya Patel',
      actor_role: 'Standby Hub',
      description: 'Priya Patel: Accepted (Remote Standby)',
      badge_variant: 'secondary',
    });
    this.timelineA501.push({
      id: `ev-${Date.now()}-3`,
      timestamp: '09:47 AM',
      actor: 'Anitha Rajan',
      actor_role: 'Mobile Roster',
      description: 'Anitha Rajan: Accepted (In-person Primary)',
      badge_variant: 'secondary',
    });
  }

  public assignInterpreter(appointmentId: string, candidateId: string): void {
    if (appointmentId !== 'A501') return;

    const chosen = this.candidatesA501.find((c) => c.id === candidateId);
    if (!chosen) return;

    // Set assignment status: chosen is ASSIGNED, others are NOT_SELECTED
    this.candidatesA501.forEach((c) => {
      if (c.id === candidateId) {
        c.assignment_status = 'ASSIGNED';
      } else if (c.response_status === 'ACCEPTED') {
        c.assignment_status = 'NOT_SELECTED';
      }
    });

    this.assignedInterpreterA501 = { ...chosen };
    this.fallbackActiveA501 = false;

    // Update appointment
    const appt = this.appointments.find((a) => a.id === 'A501');
    if (appt) {
      appt.visit_status = 'INTERPRETER_CONFIRMED';
      appt.interpreter_status_label = `Confirmed (${chosen.name})`;
      appt.interpreter_name = chosen.name;
      appt.action_required = false;
      appt.urgent_badge = undefined;
    }

    this.timelineA501.push({
      id: `ev-${Date.now()}`,
      timestamp: '09:48 AM',
      actor: 'Elena Vance',
      actor_role: 'Staff Coordinator',
      description: `Elena Vance confirmed final assignment: ${chosen.name} (${chosen.mode === 'IN_PERSON' ? 'In-Person' : 'Remote'})`,
      badge_variant: 'success',
    });
  }

  public simulateCancellation(appointmentId: string): void {
    if (appointmentId !== 'A501') return;

    // Anitha cancels
    const anitha = this.candidatesA501.find((c) => c.id === 'int_anitha_rajan');
    if (anitha) {
      anitha.assignment_status = 'CANCELLED';
      anitha.cancellation_reason = 'Unforeseen medical transit delay 25m prior to appointment.';
    }

    this.assignedInterpreterA501 = undefined;
    this.fallbackActiveA501 = true;

    // Priority standby candidate Priya is available
    const priya = this.candidatesA501.find((c) => c.id === 'int_priya_patel');
    if (priya) {
      priya.assignment_status = 'UNASSIGNED';
    }

    // Update appointment
    const appt = this.appointments.find((a) => a.id === 'A501');
    if (appt) {
      appt.visit_status = 'COORDINATING';
      appt.interpreter_status_label = 'Fallback Required';
      appt.interpreter_name = undefined;
      appt.action_required = true;
      appt.urgent_badge = 'Interpreter Cancelled';
    }

    // Add escalation item
    const existingEsc = this.escalations.find((e) => e.appointment_id === 'A501');
    if (!existingEsc) {
      this.escalations.unshift({
        id: `ESC-${Date.now().toString().slice(-3)}`,
        appointment_id: 'A501',
        patient_mrn: 'P1024',
        patient_name: 'Rohan',
        department: 'ENT / Otolaryngology',
        scheduled_time: 'Today, 10:30 AM',
        priority: 'CRITICAL',
        status: 'OPEN',
        summary: 'Primary interpreter Anitha Rajan cancelled. Remote fallback standby ready.',
        reason: 'Transit delay. Patient preferred in-person, accepted remote contingency.',
        created_at: '10:02 AM',
        assigned_to: 'Elena Vance',
      });
    }

    this.timelineA501.push({
      id: `ev-${Date.now()}-1`,
      timestamp: '10:02 AM',
      actor: 'Anitha Rajan',
      actor_role: 'Mobile Roster',
      description: 'Interpreter cancellation received: Anitha Rajan (transit delay)',
      badge_variant: 'alert',
    });
    this.timelineA501.push({
      id: `ev-${Date.now()}-2`,
      timestamp: '10:03 AM',
      actor: 'Fallback Engine',
      actor_role: 'Fallback Engine',
      description: 'Synthesized policy fallback: Standby remote candidate Priya Patel ready for staff confirmation',
      badge_variant: 'secondary',
    });
  }

  public approveFallback(appointmentId: string, candidateId: string): void {
    if (appointmentId !== 'A501') return;

    const chosen = this.candidatesA501.find((c) => c.id === candidateId);
    if (!chosen) return;

    chosen.assignment_status = 'ASSIGNED';
    this.assignedInterpreterA501 = { ...chosen };
    this.fallbackActiveA501 = false;

    // Update appointment
    const appt = this.appointments.find((a) => a.id === 'A501');
    if (appt) {
      appt.visit_status = 'INTERPRETER_CONFIRMED';
      appt.interpreter_status_label = `Confirmed (${chosen.name} · Remote)`;
      appt.interpreter_name = chosen.name;
      appt.action_required = false;
      appt.urgent_badge = undefined;
    }

    // Resolve associated escalation if present
    const esc = this.escalations.find((e) => e.appointment_id === 'A501');
    if (esc) {
      esc.status = 'RESOLVED';
      esc.resolution_notes = `Resolved via remote fallback assignment of ${chosen.name}.`;
    }

    this.timelineA501.push({
      id: `ev-${Date.now()}`,
      timestamp: '10:05 AM',
      actor: 'Elena Vance',
      actor_role: 'Staff Coordinator',
      description: `Elena Vance approved fallback assignment: ${chosen.name} (Remote Tele-ISL). Contingency confirmed.`,
      badge_variant: 'success',
    });
  }

  public getEscalations(): EscalationRecord[] {
    return [...this.escalations];
  }

  public resolveEscalation(escalationId: string, notes: string): void {
    const esc = this.escalations.find((e) => e.id === escalationId);
    if (esc) {
      esc.status = 'RESOLVED';
      esc.resolution_notes = notes || 'Resolved by staff coordinator.';
    }
  }

  public sendDeskNotice(appointmentId: string, text: string): RoutineMessage {
    const newMsg: RoutineMessage = {
      id: `msg-${Date.now()}`,
      timestamp: 'Just now',
      sender_name: 'Elena Vance',
      sender_role: 'Staff Coordinator',
      recipient_target: 'ENT Reception Desk A-104',
      text,
    };

    if (appointmentId === 'A501') {
      this.messagesA501.unshift(newMsg);
      this.timelineA501.push({
        id: `ev-${Date.now()}`,
        timestamp: 'Just now',
        actor: 'Elena Vance',
        actor_role: 'Staff Coordinator',
        description: `Transmitted desk notice to ENT Room A-104: "${text.slice(0, 45)}..."`,
        badge_variant: 'primary',
      });
    }

    return newMsg;
  }
}

// Singleton state store instance
const store = new StaffStateStore();

export const staffService = {
  async getDashboardData(): Promise<StaffDashboardData> {
    await new Promise((r) => setTimeout(r, 40));
    return store.getDashboardData();
  },

  async getAppointments(filter?: string): Promise<StaffAppointmentSummary[]> {
    await new Promise((r) => setTimeout(r, 40));
    return store.getAppointments(filter);
  },

  async getAppointmentWorkspace(appointmentId: string): Promise<AppointmentWorkspaceDetail | null> {
    await new Promise((r) => setTimeout(r, 40));
    return store.getWorkspace(appointmentId);
  },

  async approveDispatchStrategy(appointmentId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 60));
    store.approveDispatch(appointmentId);
  },

  async assignInterpreter(appointmentId: string, candidateId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 60));
    store.assignInterpreter(appointmentId, candidateId);
  },

  async simulateInterpreterCancellation(appointmentId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 60));
    store.simulateCancellation(appointmentId);
  },

  async approveFallbackAssignment(appointmentId: string, candidateId: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 60));
    store.approveFallback(appointmentId, candidateId);
  },

  async getEscalations(): Promise<EscalationRecord[]> {
    await new Promise((r) => setTimeout(r, 40));
    return store.getEscalations();
  },

  async resolveEscalation(escalationId: string, notes: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 50));
    store.resolveEscalation(escalationId, notes);
  },

  async sendDeskNotice(appointmentId: string, text: string): Promise<RoutineMessage> {
    await new Promise((r) => setTimeout(r, 40));
    return store.sendDeskNotice(appointmentId, text);
  },

  async resetScenario(): Promise<void> {
    await new Promise((r) => setTimeout(r, 20));
    store.reset();
  },
};

export default staffService;
