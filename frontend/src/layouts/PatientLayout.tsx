import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PatientHeader from '../components/layout/PatientHeader';

export default function PatientLayout() {
  const { backendUser } = useAuth();

  return (
    <div data-layout="patient" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%' }}>
      <PatientHeader
        userFullName={backendUser?.full_name || undefined}
        userRole={backendUser?.role || undefined}
      />
      <main id="main-content" className="container-wide" style={{ flex: 1, paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-8)' }}>
        <Outlet />
      </main>
    </div>
  );
}
