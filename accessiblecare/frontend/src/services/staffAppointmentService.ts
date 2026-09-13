import { api } from '../lib/api';
import type { Appointment } from '../types/patient';

interface ApiAppointment {
  id: string;
  external_id?: string | null;
  department?: string | null;
  hospital?: string | null;
  hospital_location?: string | null;
  doctor_name?: string | null;
  appointment_time: string;
  status: string;
  source: string;
}

const toAppointment = (row: ApiAppointment): Appointment => ({
  id: row.id,
  patient_id: '',
  external_id: row.external_id || undefined,
  department: row.department || undefined,
  hospital: row.hospital || undefined,
  location: row.hospital_location || undefined,
  doctor_name: row.doctor_name || undefined,
  appointment_time: row.appointment_time,
  status: row.status,
  source: row.source,
});

export const staffAppointmentService = {
  async get(appointmentId: string): Promise<Appointment> {
    const row = await api.request<ApiAppointment>(
      `/api/staff/appointments/${encodeURIComponent(appointmentId)}`,
    );
    return toAppointment(row);
  },
};

export default staffAppointmentService;
