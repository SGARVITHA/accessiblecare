import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import StaffHeader from '../components/layout/StaffHeader';

export default function StaffLayout() {
  const { backendUser } = useAuth();

  return (
    <div
      data-layout="staff"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <StaffHeader
        userFullName={backendUser?.full_name || undefined}
        userRole={backendUser?.role || undefined}
      />
      <main
        id="staff-main-content"
        className="container-wide"
        style={{
          flex: 1,
          paddingTop: 'var(--space-6)',
          paddingBottom: 'var(--space-8)',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
