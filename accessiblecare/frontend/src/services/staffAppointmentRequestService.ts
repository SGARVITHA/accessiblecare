import { api } from '../lib/api';
import type { AppointmentRequest } from '../types/patient';

export interface AppointmentRequestConfirmPayload {
  department_id?: string | null;
  appointment_time: string;
  doctor_name?: string | null;
}

export const staffAppointmentRequestService = {
  async list(): Promise<AppointmentRequest[]> {
    return api.request<AppointmentRequest[]>('/api/staff/appointment-requests');
  },

  async get(requestId: string): Promise<AppointmentRequest> {
    return api.request<AppointmentRequest>(`/api/staff/appointment-requests/${encodeURIComponent(requestId)}`);
  },

  async confirm(requestId: string, payload: AppointmentRequestConfirmPayload): Promise<{ request: AppointmentRequest; appointment_id: string; status: string }> {
    return api.request<{ request: AppointmentRequest; appointment_id: string; status: string }>(
      `/api/staff/appointment-requests/${encodeURIComponent(requestId)}/confirm`,
      { method: 'POST', body: JSON.stringify(payload) },
    );
  },

  async reject(requestId: string): Promise<AppointmentRequest> {
    return api.request<AppointmentRequest>(
      `/api/staff/appointment-requests/${encodeURIComponent(requestId)}/reject`,
      { method: 'POST', body: JSON.stringify({}) },
    );
  },
};

export default staffAppointmentRequestService;
