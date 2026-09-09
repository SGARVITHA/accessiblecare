import type {
  InterpreterProfile,
  InterpreterIncomingRequest,
  InterpreterAssignment,
  AvailabilitySlot,
  VideoSessionState,
  InterpreterDashboardSummary,
  InterpreterDutyStatus,
  AssignmentCoordinationStatus,
} from '../types/interpreter';

// Canonical In-Memory State
let profileState: InterpreterProfile = {
  id: 'INT-301',
  full_name: 'Anitha Rajan',
  role: 'INTERPRETER',
  certification_level: 'Certified ISL Interpreter (Level 3 - Medical Specialist)',
  languages: ['ISL (Indian Sign Language)', 'Signed English', 'Tactile ISL'],
  active_status: 'AVAILABLE',
  phone: '+91 98450 12345',
  email: 'anitha.rajan@hospital.org',
  shift_hours: '08:00 AM – 04:30 PM',
  duty_location: 'West Wing & Tele-ISL Pod 2',
};

const requestsState: InterpreterIncomingRequest[] = [
  {
    id: 'REQ-701',
    appointment_id: 'A501',
    patient_name: 'Rohan Verma',
    patient_mrn: 'P1024',
    department: 'ENT Clinic',
    doctor_name: 'Dr. Sharma',
    location: 'Building B, Room 204',
    appointment_time: '10:30 AM – 11:00 AM',
    date: 'Today',
    modality: 'IN_PERSON',
    communication_type: 'ISL',
    routing_mode: 'PRIMARY',
    urgency: 'NORMAL',
    response_status: 'PENDING',
    assignment_status: 'UNASSIGNED',
    notes: 'First-time consultation. Patient prefers clear lighting and direct line of sight.',
    received_at: '10:10 AM',
    expires_in_minutes: 12,
  },
  {
    id: 'REQ-703',
    appointment_id: 'A503',
    patient_name: 'Anand Kumar',
    patient_mrn: 'P1028',
    department: 'Cardiology OPD',
    doctor_name: 'Dr. Mehta',
    location: 'Building A, Room 102',
    appointment_time: '02:00 PM – 02:45 PM',
    date: 'Today',
    modality: 'IN_PERSON',
    communication_type: 'ISL',
    routing_mode: 'BACKUP',
    urgency: 'URGENT',
    response_status: 'PENDING',
    assignment_status: 'UNASSIGNED',
    notes: 'Primary interpreter slot reassigned due to emergency. Backup escalation routed to Anitha.',
    received_at: '10:15 AM',
    expires_in_minutes: 6,
  },
];

const assignmentsState: InterpreterAssignment[] = [
  {
    id: 'ASN-501',
    appointment_id: 'A501',
    patient_name: 'Rohan Verma',
    patient_mrn: 'P1024',
    department: 'ENT Clinic',
    doctor_name: 'Dr. Sharma',
    location: 'Building B, Room 204',
    appointment_time: '10:30 AM – 11:00 AM',
    date: 'Today',
    modality: 'IN_PERSON',
    communication_type: 'ISL',
    status: 'ASSIGNED',
    clinical_notes: 'Initial auditory and ear canal examination. Doctor will review audiogram findings.',
    patient_accessibility_notes: 'Visual Queue alert active; patient requested in-person ISL interpreter.',
    meeting_point: 'Waiting Lobby Desk 2 (West Wing)',
    staff_contact: 'Nurse Preeti (Ext 4012)',
  },
  {
    id: 'ASN-502',
    appointment_id: 'A502',
    patient_name: 'Devika Pillai',
    patient_mrn: 'P1025',
    department: 'Ophthalmology',
    doctor_name: 'Dr. Varma',
    location: 'Virtual / Tele-Clinic Pod 2',
    appointment_time: '11:30 AM – 12:00 PM',
    date: 'Today',
    modality: 'REMOTE',
    communication_type: 'ISL',
    status: 'ASSIGNED',
    video_session_id: 'VS-502',
    clinical_notes: 'Post-operative cataract follow-up. Doctor requires clear high-contrast sign visibility.',
    patient_accessibility_notes: 'Remote VRI fallback approved; patient joins via AccessibleCare mobile browser.',
    meeting_point: 'Tele-ISL Pod 2 Console',
    staff_contact: 'Coordinator Suresh (Ext 2201)',
  },
];

const availabilitySlotsState: AvailabilitySlot[] = [
  {
    id: 'SLOT-01',
    date: 'Today (Sep 10)',
    day_of_week: 'Thursday',
    start_time: '08:00 AM',
    end_time: '04:30 PM',
    routing_mode: 'PRIMARY',
    status: 'PARTIALLY_BOOKED',
  },
  {
    id: 'SLOT-02',
    date: 'Tomorrow (Sep 11)',
    day_of_week: 'Friday',
    start_time: '08:00 AM',
    end_time: '04:30 PM',
    routing_mode: 'PRIMARY',
    status: 'AVAILABLE',
  },
  {
    id: 'SLOT-03',
    date: 'Sep 12',
    day_of_week: 'Saturday',
    start_time: '08:00 AM',
    end_time: '01:00 PM',
    routing_mode: 'BACKUP',
    status: 'AVAILABLE',
  },
  {
    id: 'SLOT-04',
    date: 'Sep 13',
    day_of_week: 'Sunday',
    start_time: '—',
    end_time: '—',
    routing_mode: 'OFF',
    status: 'OFF_DUTY',
  },
  {
    id: 'SLOT-05',
    date: 'Sep 14',
    day_of_week: 'Monday',
    start_time: '08:00 AM',
    end_time: '04:30 PM',
    routing_mode: 'PRIMARY',
    status: 'AVAILABLE',
  },
  {
    id: 'SLOT-06',
    date: 'Sep 15',
    day_of_week: 'Tuesday',
    start_time: '08:00 AM',
    end_time: '04:30 PM',
    routing_mode: 'PRIMARY',
    status: 'AVAILABLE',
  },
  {
    id: 'SLOT-07',
    date: 'Sep 16',
    day_of_week: 'Wednesday',
    start_time: '08:00 AM',
    end_time: '04:30 PM',
    routing_mode: 'BACKUP',
    status: 'AVAILABLE',
  },
];

let videoSessionState: VideoSessionState = {
  session_id: 'VS-502',
  appointment_id: 'A502',
  status: 'READY',
  patient_name: 'Devika Pillai',
  doctor_name: 'Dr. Varma',
  department: 'Ophthalmology Clinic',
  audio_enabled: true,
  video_enabled: true,
  captions_enabled: true,
  pin_patient_feed: false,
  connection_quality: 'EXCELLENT',
};

export const interpreterService = {
  async getProfile(): Promise<InterpreterProfile> {
    return Promise.resolve({ ...profileState });
  },

  async updateDutyStatus(status: InterpreterDutyStatus): Promise<InterpreterProfile> {
    profileState = { ...profileState, active_status: status };
    return Promise.resolve({ ...profileState });
  },

  async getDashboardSummary(): Promise<InterpreterDashboardSummary> {
    const pendingRequests = requestsState.filter((r) => r.response_status === 'PENDING');
    const todayAssignments = assignmentsState.filter(
      (a) => a.date === 'Today' && a.status !== 'CANCELLED'
    );
    const completedToday = assignmentsState.filter(
      (a) => a.date === 'Today' && a.status === 'COMPLETED'
    );
    const nextAssignment = todayAssignments.find(
      (a) => a.status === 'ASSIGNED' || a.status === 'CHECKED_IN' || a.status === 'IN_SESSION'
    );

    return Promise.resolve({
      profile: { ...profileState },
      pending_requests_count: pendingRequests.length,
      today_assignments_count: todayAssignments.length,
      completed_today_count: completedToday.length,
      next_assignment: nextAssignment ? { ...nextAssignment } : undefined,
      recent_requests: [...requestsState],
      today_assignments: [...assignmentsState],
    });
  },

  async getRequests(): Promise<InterpreterIncomingRequest[]> {
    return Promise.resolve([...requestsState]);
  },

  async getRequestById(id: string): Promise<InterpreterIncomingRequest | undefined> {
    const req = requestsState.find((r) => r.id === id);
    return Promise.resolve(req ? { ...req } : undefined);
  },

  /**
   * Responds to an incoming interpreter request.
   * INVARIANT: ACCEPTED does NOT mean ASSIGNED.
   * Accepting only registers interpreter availability/willingness; assignment requires staff confirmation.
   */
  async respondToRequest(
    id: string,
    action: 'ACCEPT' | 'DECLINE'
  ): Promise<{ request: InterpreterIncomingRequest; message: string }> {
    const idx = requestsState.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Request ${id} not found.`);
    }

    const current = requestsState[idx];
    const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';

    // Invariant: assignment_status remains 'UNASSIGNED' even if accepted
    const updated: InterpreterIncomingRequest = {
      ...current,
      response_status: newStatus,
      assignment_status: 'UNASSIGNED',
    };
    requestsState[idx] = updated;

    const message =
      action === 'ACCEPT'
        ? `Request ${id} accepted. Status set to ACCEPTED. Staff coordinator will confirm formal assignment.`
        : `Request ${id} declined. Automated routing will cascade to the next available interpreter.`;

    return Promise.resolve({ request: { ...updated }, message });
  },

  async getAssignments(): Promise<InterpreterAssignment[]> {
    return Promise.resolve([...assignmentsState]);
  },

  async getAssignmentById(id: string): Promise<InterpreterAssignment | undefined> {
    const a = assignmentsState.find((item) => item.id === id);
    return Promise.resolve(a ? { ...a } : undefined);
  },

  /**
   * Updates assignment lifecycle status (e.g. CHECKED_IN, IN_SESSION, COMPLETED, CANCELLED).
   * Workflow-Controlled Cancellation: Triggers fallback escalation in coordinator workflow.
   */
  async updateAssignmentStatus(
    id: string,
    status: AssignmentCoordinationStatus,
    reason?: string
  ): Promise<{ assignment: InterpreterAssignment; message: string }> {
    const idx = assignmentsState.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Assignment ${id} not found.`);
    }

    const current = assignmentsState[idx];
    const updatedNotes = reason
      ? `${current.clinical_notes || ''} [Cancellation reason: ${reason}]`.trim()
      : current.clinical_notes;

    const updated: InterpreterAssignment = {
      ...current,
      status,
      clinical_notes: updatedNotes,
    };
    assignmentsState[idx] = updated;

    let message = `Assignment ${id} updated to ${status}.`;
    if (status === 'CANCELLED') {
      message = `Assignment ${id} marked CANCELLED. Staff coordination notified for backup interpreter dispatch.`;
    }

    return Promise.resolve({ assignment: { ...updated }, message });
  },

  async getAvailabilitySlots(): Promise<AvailabilitySlot[]> {
    return Promise.resolve([...availabilitySlotsState]);
  },

  async updateAvailabilitySlot(payload: {
    id?: string;
    date: string;
    day_of_week?: string;
    start_time: string;
    end_time: string;
    routing_mode: 'PRIMARY' | 'BACKUP' | 'OFF';
  }): Promise<AvailabilitySlot> {
    const existingIdx = availabilitySlotsState.findIndex(
      (s) => (payload.id && s.id === payload.id) || s.date.includes(payload.date)
    );

    if (existingIdx !== -1) {
      const existing = availabilitySlotsState[existingIdx];
      const updated: AvailabilitySlot = {
        ...existing,
        start_time: payload.start_time,
        end_time: payload.end_time,
        routing_mode: payload.routing_mode,
        status: payload.routing_mode === 'OFF' ? 'OFF_DUTY' : 'AVAILABLE',
      };
      availabilitySlotsState[existingIdx] = updated;
      return Promise.resolve({ ...updated });
    } else {
      const newSlot: AvailabilitySlot = {
        id: `SLOT-${Date.now().toString().slice(-4)}`,
        date: payload.date,
        day_of_week: payload.day_of_week || 'Scheduled Day',
        start_time: payload.start_time,
        end_time: payload.end_time,
        routing_mode: payload.routing_mode,
        status: payload.routing_mode === 'OFF' ? 'OFF_DUTY' : 'AVAILABLE',
      };
      availabilitySlotsState.push(newSlot);
      return Promise.resolve({ ...newSlot });
    }
  },

  async getVideoSession(sessionId: string): Promise<VideoSessionState> {
    if (videoSessionState.session_id === sessionId) {
      return Promise.resolve({ ...videoSessionState });
    }
    // Return a session scaffold if not found
    return Promise.resolve({
      session_id: sessionId,
      appointment_id: 'A502',
      status: 'READY',
      patient_name: 'Devika Pillai',
      doctor_name: 'Dr. Varma',
      department: 'Ophthalmology',
      audio_enabled: true,
      video_enabled: true,
      captions_enabled: true,
      pin_patient_feed: false,
      connection_quality: 'EXCELLENT',
    });
  },

  async updateVideoSession(
    sessionId: string,
    updates: Partial<VideoSessionState>
  ): Promise<VideoSessionState> {
    if (videoSessionState.session_id === sessionId) {
      videoSessionState = { ...videoSessionState, ...updates };
      return Promise.resolve({ ...videoSessionState });
    }
    return Promise.resolve({ ...videoSessionState, ...updates });
  },
};
