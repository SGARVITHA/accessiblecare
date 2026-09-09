import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function StaffLayout() {
  const { backendUser, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div data-layout="staff">
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1.5rem',
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          borderBottom: '1px solid #334155',
          fontSize: '0.875rem',
        }}
      >
        <div>
          <strong>AccessibleCare</strong> — Staff Portal
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            {backendUser?.full_name || 'Staff Member'} ({backendUser?.role || 'STAFF'})
          </span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '0.25rem 0.75rem',
              backgroundColor: '#334155',
              color: '#ffffff',
              border: '1px solid #475569',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
