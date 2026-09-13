import { useParams } from 'react-router-dom';
import StaffAppointmentWorkspacePage from './StaffAppointmentWorkspacePage';
import StaffRealAppointmentDetailPage from './StaffRealAppointmentDetailPage';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function StaffAppointmentRoutePage() {
  const { id } = useParams<{ id: string }>();

  if (id && UUID_PATTERN.test(id)) {
    return <StaffRealAppointmentDetailPage />;
  }

  return <StaffAppointmentWorkspacePage />;
}
