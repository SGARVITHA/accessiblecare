import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import PatientLayout from './layouts/PatientLayout';
import StaffLayout from './layouts/StaffLayout';
import InterpreterLayout from './layouts/InterpreterLayout';
import PatientDashboard from './pages/patient/PatientDashboard';
import AppointmentListPage from './pages/patient/AppointmentListPage';
import AppointmentDetailsPage from './pages/patient/AppointmentDetailsPage';
import AccessibilitySetupPage from './pages/patient/AccessibilitySetupPage';
import InterpreterStatusPage from './pages/patient/InterpreterStatusPage';
import QuickCommunicationPage from './pages/patient/QuickCommunicationPage';
import AppointmentRequestPage from './pages/patient/AppointmentRequestPage';
import AppointmentRequestsPage from './pages/patient/AppointmentRequestsPage';
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffAppointmentsPage from './pages/staff/StaffAppointmentsPage';
import StaffAppointmentWorkspacePage from './pages/staff/StaffAppointmentWorkspacePage';
import StaffAppointmentRequestsPage from './pages/staff/StaffAppointmentRequestsPage';
import StaffAppointmentRequestDetailPage from './pages/staff/StaffAppointmentRequestDetailPage';
import StaffEscalationsPage from './pages/staff/StaffEscalationsPage';
import InterpreterDashboard from './pages/interpreter/InterpreterDashboard';
import InterpreterRequestsPage from './pages/interpreter/InterpreterRequestsPage';
import InterpreterRequestDetailPage from './pages/interpreter/InterpreterRequestDetailPage';
import InterpreterAssignmentsPage from './pages/interpreter/InterpreterAssignmentsPage';
import InterpreterAvailabilityPage from './pages/interpreter/InterpreterAvailabilityPage';
import InterpreterSessionPage from './pages/interpreter/InterpreterSessionPage';
import NotFound from './pages/NotFound';

function RootRedirect() {
  const { isAuthenticated, isLoading, role } = useAuth();
  if (isLoading) return <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}><p>Initializing application...</p></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const currentRole = role?.toUpperCase();
  if (currentRole === 'STAFF') return <Navigate to="/staff" replace />;
  if (currentRole === 'INTERPRETER') return <Navigate to="/interpreter" replace />;
  return <Navigate to="/patient" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route index element={<RootRedirect />} />
          <Route path="/patient" element={<ProtectedRoute allowedRoles={['PATIENT']}><PatientLayout /></ProtectedRoute>}>
            <Route index element={<PatientDashboard />} />
            <Route path="appointments" element={<AppointmentListPage />} />
            <Route path="appointments/:id" element={<AppointmentDetailsPage />} />
            <Route path="accessibility" element={<AccessibilitySetupPage />} />
            <Route path="interpreter" element={<InterpreterStatusPage />} />
            <Route path="communication" element={<QuickCommunicationPage />} />
            <Route path="appointment-request" element={<AppointmentRequestPage />} />
            <Route path="appointment-requests" element={<AppointmentRequestsPage />} />
          </Route>
          <Route path="/staff" element={<ProtectedRoute allowedRoles={['STAFF']}><StaffLayout /></ProtectedRoute>}>
            <Route index element={<StaffDashboard />} />
            <Route path="appointments" element={<StaffAppointmentsPage />} />
            <Route path="appointments/:id" element={<StaffAppointmentWorkspacePage />} />
            <Route path="appointment-requests" element={<StaffAppointmentRequestsPage />} />
            <Route path="appointment-requests/:id" element={<StaffAppointmentRequestDetailPage />} />
            <Route path="escalations" element={<StaffEscalationsPage />} />
          </Route>
          <Route path="/interpreter" element={<ProtectedRoute allowedRoles={['INTERPRETER']}><InterpreterLayout /></ProtectedRoute>}>
            <Route index element={<InterpreterDashboard />} />
            <Route path="requests" element={<InterpreterRequestsPage />} />
            <Route path="requests/:id" element={<InterpreterRequestDetailPage />} />
            <Route path="assignments" element={<InterpreterAssignmentsPage />} />
            <Route path="availability" element={<InterpreterAvailabilityPage />} />
            <Route path="session/:id" element={<InterpreterSessionPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
