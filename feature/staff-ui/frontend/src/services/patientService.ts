/**
 * AccessibleCare Patient Experience Service Layer
 *
 * Provides a typed interface for patient data fetching and mutations.
 * Currently uses central demo mock data as a temporary fallback until backend
 * Phase 1 patient endpoints (/api/patient/*) are implemented.
 */

import type {
  Patient,
  Appointment,
  AccessibilityProfile,
  InterpreterStatus,
  QuickMessage,
  PatientDashboardSummary,
  PatientNotification,
} from '../types/patient';

// Central Canonical Demo Mock Data
const DEMO_PATIENT: Patient = {
  id: 'usr_pat_1024',
  full_name: 'Rohan',
  mrn: 'P1024',
  primary_language: 'Indian Sign Language (ISL)',
  email: 'rohan.patient@accessiblecare.demo',
};

const DEMO_APPOINTMENT: Appointment = {
  id: 'A501',
  patient_id: 'usr_pat_1024',
  doctor_name: 'Dr Sharma',
  department: 'ENT / Otolaryngology',
  location: 'Outpatient Block B, Room 204',
  appointment_time: 'Today, 10:30 AM – 11:00 AM',
  status: 'SCHEDULED',
  accessibility_confirmed: true,
  interpreter_required: true,
  notes: 'Routine audiogram and ENT follow-up consultation.',
};

const DEMO_ACCESSIBILITY_PROFILE: AccessibilityProfile = {
  id: 'acc_prof_1024',
  patient_id: 'usr_pat_1024',
  communication_preference: 'ISL',
  interpreter_required: true,
  interpreter_mode: 'IN_PERSON',
  allow_remote_fallback: true,
  companion_present: false,
  visual_reception_alert: true,
  visual_queue_alert: true,
  escort_assistance: false,
  special_instructions: 'Prefers clear visual alerts on room display and SMS notification.',
};

const DEMO_INTERPRETER_STATUS: InterpreterStatus = {
  appointment_id: 'A501',
  status: 'CONFIRMED',
  interpreter_name: 'Anitha Rajan',
  qualification_level: 'Certified ISL Medical Interpreter (Level 3)',
  communication_mode: 'IN_PERSON',
  meeting_point: 'ENT Department Reception desk (Floor 2)',
  eta: '10:15 AM (Arrived on site)',
  contingency_note: 'Remote VRI fallback active and available on tablet as backup.',
};

const DEMO_NOTIFICATIONS: PatientNotification[] = [
  {
    id: 'notif_1',
    title: 'Interpreter Confirmed',
    message: 'Anitha Rajan (ISL) has been confirmed for your 10:30 AM ENT appointment.',
    type: 'success',
    timestamp: '10 mins ago',
    read: false,
  },
  {
    id: 'notif_2',
    title: 'Appointment Check-in Open',
    message: 'You can check in online or proceed to ENT Reception Desk.',
    type: 'info',
    timestamp: '25 mins ago',
    read: true,
  },
];

export const patientService = {
  /**
   * Fetch complete patient dashboard summary.
   */
  async getPatientDashboard(): Promise<PatientDashboardSummary> {
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      patient: DEMO_PATIENT,
      next_appointment: DEMO_APPOINTMENT,
      accessibility_profile: DEMO_ACCESSIBILITY_PROFILE,
      interpreter_status: DEMO_INTERPRETER_STATUS,
      notifications: DEMO_NOTIFICATIONS,
    };
  },

  /**
   * Fetch details for a specific appointment.
   */
  async getAppointment(appointmentId: string): Promise<Appointment | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (appointmentId === DEMO_APPOINTMENT.id || appointmentId === 'next') {
      return DEMO_APPOINTMENT;
    }
    return null;
  },

  /**
   * Fetch accessibility profile for current patient.
   */
  async getAccessibilityProfile(): Promise<AccessibilityProfile> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return DEMO_ACCESSIBILITY_PROFILE;
  },

  /**
   * Update accessibility profile.
   */
  async updateAccessibilityProfile(
    profile: Partial<AccessibilityProfile>
  ): Promise<AccessibilityProfile> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    Object.assign(DEMO_ACCESSIBILITY_PROFILE, profile);
    return { ...DEMO_ACCESSIBILITY_PROFILE };
  },

  /**
   * Fetch interpreter confirmation status for an appointment.
   */
  async getInterpreterStatus(appointmentId: string): Promise<InterpreterStatus | null> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (appointmentId === DEMO_APPOINTMENT.id || appointmentId === 'next') {
      return DEMO_INTERPRETER_STATUS;
    }
    return null;
  },

  /**
   * Send a quick routine communication phrase to hospital staff/desk.
   */
  async sendQuickCommunication(
    category: 'arrival' | 'navigation' | 'help' | 'general',
    text: string
  ): Promise<QuickMessage> {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      id: `msg_${Date.now()}`,
      patient_id: DEMO_PATIENT.id,
      category,
      text,
      created_at: new Date().toISOString(),
    };
  },
};

export default patientService;
