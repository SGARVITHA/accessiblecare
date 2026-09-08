import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import PatientLayout from './layouts/PatientLayout'
import StaffLayout from './layouts/StaffLayout'
import InterpreterLayout from './layouts/InterpreterLayout'

import PatientDashboard from './pages/patient/PatientDashboard'
import StaffDashboard from './pages/staff/StaffDashboard'
import InterpreterDashboard from './pages/interpreter/InterpreterDashboard'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to /patient for now */}
        <Route index element={<Navigate to="/patient" replace />} />

        {/* Patient routes */}
        <Route path="/patient" element={<PatientLayout />}>
          <Route index element={<PatientDashboard />} />
        </Route>

        {/* Staff routes */}
        <Route path="/staff" element={<StaffLayout />}>
          <Route index element={<StaffDashboard />} />
        </Route>

        {/* Interpreter routes */}
        <Route path="/interpreter" element={<InterpreterLayout />}>
          <Route index element={<InterpreterDashboard />} />
        </Route>

        {/* 404 catch-all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
