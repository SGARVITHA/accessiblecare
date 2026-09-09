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
  doctor_name: string;
  department: string;
  location: string;
  appointment_time: string;
  status: AppointmentStatus;
  accessibility_confirmed: boolean;
  interpreter_required: boolean;
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
  visual_reception_alert: boolean;
  visual_queue_alert: boolean;
  escort_assistance: boolean;
  special_instructions?: string;
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
