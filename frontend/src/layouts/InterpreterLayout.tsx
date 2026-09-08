import { Outlet } from 'react-router-dom'

export default function InterpreterLayout() {
  return (
    <div data-layout="interpreter">
      <Outlet />
    </div>
  )
}
