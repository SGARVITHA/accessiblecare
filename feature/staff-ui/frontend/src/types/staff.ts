/**
 * AccessibleCare Staff Operational Domain Models
 *
 * Defines contracts for staff coordination, appointment queues,
 * AI dispatch recommendations, candidate pools, and escalations.
 */

export type AccessibilityVisitStatus =
  | 'CREATED'
  | 'PREFERENCES_CONFIRMED'
  | 'COORDINATING'
  | 'INTERPRETER_CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ESCALATED'
  | 'RESOLVED';

export type InterpreterResponseStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'UNAVAILABLE';

export type InterpreterAssignmentStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'NOT_SELECTED'
  | 'CANCELLED';

export type CommunicationMode = 'IN_PERSON' | 'REMOTE';

export type EscalationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type EscalationStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface InterpreterCandidate {
  id: string;
  name: string;
  badge_number: string;
  language: string;
  mode: CommunicationMode;
  certification: string;
  availability_window: string;
  proximity_station: string;
  shift: string;
  is_primary_recommendation: boolean;
  response_status: InterpreterResponseStatus;
  assignment_status: InterpreterAssignmentStatus;
  response_timestamp?: string;
  cancellation_reason?: string;
}

export interface AIDispatchRecommendation {
  strategy: 'PARALLEL_TOP_2' | 'BROADCAST_POOL' | 'DIRECT_ASSIGNMENT';
  strategy_name: string;
  rationale: string;
  policy_reference: string;
  governance_rule: string;
  candidate_ids: string[];
  recommended_primary_id: string;
  recommended_fallback_id?: string;
}

export interface ValidatedRequirements {
  language: string;
  interpreter_required: boolean;
  preferred_mode: CommunicationMode;
  remote_fallback_accepted: boolean;
  companion_present: boolean;
  visual_queue_alert: boolean;
  special_instructions?: string;
}

export interface AuditTimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  actor_role: 'Patient Portal' | 'AI Engine' | 'Staff Coordinator' | 'Standby Hub' | 'Mobile Roster' | 'Fallback Engine' | 'System';
  description: string;
  badge_variant?: 'primary' | 'secondary' | 'alert' | 'success';
}

export interface RoutineMessage {
  id: string;
  timestamp: string;
  sender_name: string;
  sender_role: string;
  recipient_target: string;
  text: string;
}

export interface StaffAppointmentSummary {
  id: string;
  patient_mrn: string;
  patient_name: string;
  department: string;
  room: string;
  scheduled_time: string;
  validated_language: string;
  preferred_mode: CommunicationMode;
  remote_accepted: boolean;
  visit_status: AccessibilityVisitStatus;
  interpreter_status_label: string;
  interpreter_name?: string;
  action_required: boolean;
  urgent_badge?: string;
}

export interface AppointmentWorkspaceDetail {
  appointment: StaffAppointmentSummary;
  requirements: ValidatedRequirements;
  ai_recommendation: AIDispatchRecommendation;
  candidates: InterpreterCandidate[];
  timeline: AuditTimelineEvent[];
  routine_messages: RoutineMessage[];
  assigned_interpreter?: InterpreterCandidate;
  fallback_active: boolean;
  fallback_recommendation?: {
    candidate: InterpreterCandidate;
    rationale: string;
  };
}

export interface EscalationRecord {
  id: string;
  appointment_id: string;
  patient_mrn: string;
  patient_name: string;
  department: string;
  scheduled_time: string;
  priority: EscalationPriority;
  status: EscalationStatus;
  summary: string;
  reason: string;
  created_at: string;
  assigned_to?: string;
  resolution_notes?: string;
}

export interface StaffOperationalMetrics {
  total_accessibility_requests_today: number;
  needs_attention_count: number;
  confirmed_sessions_count: number;
  open_escalations_count: number;
}

export interface StaffDashboardData {
  metrics: StaffOperationalMetrics;
  needs_attention: StaffAppointmentSummary[];
  today_appointments: StaffAppointmentSummary[];
}
