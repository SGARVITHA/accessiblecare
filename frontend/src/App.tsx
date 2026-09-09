import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/auth/LoginPage';
import PatientLayout from './layouts/PatientLayout';
import StaffLayout from './layouts/StaffLayout';
import InterpreterLayout from './layouts/InterpreterLayout';

import PatientDashboard from './pages/patient/PatientDashboard';
import AppointmentDetailsPage from './pages/patient/AppointmentDetailsPage';
import AccessibilitySetupPage from './pages/patient/AccessibilitySetupPage';
import InterpreterStatusPage from './pages/patient/InterpreterStatusPage';
import QuickCommunicationPage from './pages/patient/QuickCommunicationPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import InterpreterDashboard from './pages/interpreter/InterpreterDashboard';
import NotFound from './pages/NotFound';

function RootRedirect() {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <p>Initializing application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = role?.toUpperCase();
  if (currentRole === 'STAFF') {
    return <Navigate to="/staff" replace />;
  } else if (currentRole === 'INTERPRETER') {
    return <Navigate to="/interpreter" replace />;
  }
  return <Navigate to="/patient" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root redirect */}
          <Route index element={<RootRedirect />} />

          {/* Role-protected Patient routes */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['PATIENT']}>
                <PatientLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PatientDashboard />} />
            <Route path="appointments" element={<AppointmentDetailsPage />} />
            <Route path="appointments/:id" element={<AppointmentDetailsPage />} />
            <Route path="accessibility" element={<AccessibilitySetupPage />} />
            <Route path="interpreter" element={<InterpreterStatusPage />} />
            <Route path="communication" element={<QuickCommunicationPage />} />
          </Route>

          {/* Role-protected Staff routes */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['STAFF']}>
                <StaffLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StaffDashboard />} />
          </Route>

          {/* Role-protected Interpreter routes */}
          <Route
            path="/interpreter"
            element={
              <ProtectedRoute allowedRoles={['INTERPRETER']}>
                <InterpreterLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InterpreterDashboard />} />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
