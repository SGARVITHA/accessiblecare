/**
 * AccessibleCare Patient Experience Domain Models
 */

export type CommunicationPreference = 'ISL' | 'TEXT' | 'SPEECH_TO_TEXT' | 'COMBINATION';

export type InterpreterMode = 'IN_PERSON' | 'REMOTE' | 'EITHER';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type AccessibilityVisitStatus =
  | 'NOT_CONFIGURED'
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

export type InterpreterConfirmationStatus =
  | 'CONFIRMED'
  | 'ASSIGNING'
  | 'PENDING'
  | 'BACKUP_ACTIVE'
  | 'UNAVAILABLE';

export interface Patient {
  id: string;
  full_name: string;
  mrn: string;
  primary_language: string;
  email?: string;
  phone?: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  external_id?: string;
  doctor_name?: string;
  department?: string;
  hospital?: string;
  location?: string;
  appointment_time: string;
  status: AppointmentStatus | string;
  source?: string;
  accessibility_confirmed?: boolean;
  interpreter_required?: boolean;
  notes?: string;
}

export interface AccessibilityProfile {
  id?: string;
  patient_id: string;
  communication_preference: CommunicationPreference;
  interpreter_required: boolean;
  interpreter_mode: InterpreterMode;
  allow_remote_fallback: boolean;
  companion_present: boolean;
  companion_preference?: string;
  visual_reception_alert?: boolean;
  visual_queue_alert?: boolean;
  escort_assistance?: boolean;
  special_instructions?: string;
}

export interface AccessibilityVisit {
  id: string;
  appointment_id: string;
  patient_id: string;
  communication_preference: CommunicationPreference;
  interpreter_required: boolean;
  preferred_mode?: InterpreterMode;
  remote_accepted: boolean;
  companion_present: boolean;
  status: AccessibilityVisitStatus;
  created_at: string;
  updated_at: string;
}

export interface AccessibilityStatus {
  configured: boolean;
  status: AccessibilityVisitStatus;
  visit: AccessibilityVisit | null;
}

export interface InterpreterStatus {
  appointment_id: string;
  status: InterpreterConfirmationStatus;
  interpreter_name?: string;
  qualification_level?: string;
  communication_mode?: InterpreterMode;
  meeting_point?: string;
  eta?: string;
  contingency_note?: string;
}

export interface QuickMessage {
  id: string;
  patient_id: string;
  category: 'arrival' | 'navigation' | 'help' | 'general';
  text: string;
  created_at: string;
}

export interface PatientNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  timestamp: string;
  read: boolean;
}

export interface PatientDashboardSummary {
  patient: Patient;
  next_appointment?: Appointment;
  accessibility_profile: AccessibilityProfile;
  interpreter_status?: InterpreterStatus;
  notifications: PatientNotification[];
}
