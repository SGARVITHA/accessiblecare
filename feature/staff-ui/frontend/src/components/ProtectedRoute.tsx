import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Loading session and verifying backend authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0) {
    const currentRole = role?.toUpperCase();
    const isAllowed = allowedRoles.some((r) => r.toUpperCase() === currentRole);

    if (!isAllowed) {
      // Direct user to their appropriate role-based dashboard based on backend-verified role
      if (currentRole === 'PATIENT') {
        return <Navigate to="/patient" replace />;
      } else if (currentRole === 'STAFF') {
        return <Navigate to="/staff" replace />;
      } else if (currentRole === 'INTERPRETER') {
        return <Navigate to="/interpreter" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
