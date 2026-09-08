import { Outlet } from 'react-router-dom'

export default function PatientLayout() {
  return (
    <div data-layout="patient">
      <Outlet />
    </div>
  )
}
