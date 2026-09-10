import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ALLOWED_ROLES = new Set(['PATIENT', 'STAFF', 'INTERPRETER']);

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

  const currentRole = role?.trim().toUpperCase();

  // Never allow an unknown/malformed backend role to enter a protected portal.
  if (!currentRole || !ALLOWED_ROLES.has(currentRole)) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const normalizedAllowedRoles = allowedRoles.map((allowedRole) => allowedRole.trim().toUpperCase());
    const isAllowed = normalizedAllowedRoles.includes(currentRole);

    if (!isAllowed) {
      if (currentRole === 'PATIENT') {
        return <Navigate to="/patient" replace />;
      }
      if (currentRole === 'STAFF') {
        return <Navigate to="/staff" replace />;
      }
      if (currentRole === 'INTERPRETER') {
        return <Navigate to="/interpreter" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
