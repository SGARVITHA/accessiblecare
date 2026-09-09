/**
 * AccessibleCare Interpreter Experience Domain Models
 */

export type InterpreterDutyStatus = 'AVAILABLE' | 'ON_CALL' | 'BUSY' | 'OFF_DUTY';

export type RequestModality = 'IN_PERSON' | 'REMOTE';

export type CommunicationMode = 'ISL' | 'TACTILE_ISL' | 'SIGNED_ENGLISH' | 'COMBINATION';

export type RoutingPriority = 'PRIMARY' | 'BACKUP';

export type RequestResponseStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type AssignmentCoordinationStatus =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'CHECKED_IN'
  | 'IN_SESSION'
  | 'COMPLETED'
  | 'CANCELLED';

export type VideoSessionStatus = 'CREATED' | 'READY' | 'ACTIVE' | 'ENDED' | 'FAILED';

export interface InterpreterProfile {
  id: string;
  full_name: string;
  role: 'INTERPRETER';
  certification_level: string;
  languages: string[];
  active_status: InterpreterDutyStatus;
  phone: string;
  email: string;
  shift_hours: string;
  duty_location: string;
}

export interface InterpreterIncomingRequest {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_mrn: string;
  department: string;
  doctor_name: string;
  location: string;
  appointment_time: string;
  date: string;
  modality: RequestModality;
  communication_type: CommunicationMode;
  routing_mode: RoutingPriority;
  urgency: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  response_status: RequestResponseStatus;
  assignment_status: 'UNASSIGNED' | 'ASSIGNED';
  notes?: string;
  received_at: string;
  expires_in_minutes: number;
}

export interface InterpreterAssignment {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_mrn: string;
  department: string;
  doctor_name: string;
  location: string;
  appointment_time: string;
  date: string;
  modality: RequestModality;
  communication_type: CommunicationMode;
  status: AssignmentCoordinationStatus;
  video_session_id?: string;
  clinical_notes?: string;
  patient_accessibility_notes?: string;
  meeting_point?: string;
  staff_contact?: string;
}

export interface AvailabilitySlot {
  id: string;
  date: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  routing_mode: RoutingPriority | 'OFF';
  status: 'AVAILABLE' | 'PARTIALLY_BOOKED' | 'FULLY_BOOKED' | 'OFF_DUTY';
}

export interface VideoSessionState {
  session_id: string;
  appointment_id: string;
  status: VideoSessionStatus;
  patient_name: string;
  doctor_name: string;
  department: string;
  audio_enabled: boolean;
  video_enabled: boolean;
  captions_enabled: boolean;
  pin_patient_feed: boolean;
  connection_quality: 'EXCELLENT' | 'GOOD' | 'POOR';
  started_at?: string;
}

export interface InterpreterDashboardSummary {
  profile: InterpreterProfile;
  pending_requests_count: number;
  today_assignments_count: number;
  completed_today_count: number;
  next_assignment?: InterpreterAssignment;
  recent_requests: InterpreterIncomingRequest[];
  today_assignments: InterpreterAssignment[];
}
