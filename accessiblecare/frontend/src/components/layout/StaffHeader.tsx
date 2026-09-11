import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import './StaffHeader.css';

export interface StaffHeaderProps {
  userFullName?: string;
  userRole?: string;
  openEscalationsCount?: number;
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({ userFullName, userRole, openEscalationsCount = 1 }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate('/login', { replace: true }); };
  const displayName = userFullName || 'Elena Vance';
  const displayRole = userRole || 'STAFF';

  return (
    <header className="ac-staff-header">
      <div className="ac-staff-header__top container-wide">
        <div className="ac-staff-header__brand">
          <NavLink to="/staff" className="ac-staff-header__logo"><span className="ac-staff-header__title">AccessibleCare</span><span className="ac-staff-header__tagline">Accessibility Operations</span></NavLink>
          <div className="ac-staff-header__coordinator-pill"><span aria-hidden="true">👤</span><span>{displayName} · Coordinator (Outpatient)</span></div>
          <div className="ac-staff-header__shift-pill"><span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'currentColor', display: 'inline-block' }} aria-hidden="true" /><span>Shift 08:00 – 16:00</span></div>
        </div>
        <div className="ac-staff-header__user-actions">
          {openEscalationsCount > 0 && <NavLink to="/staff/escalations" className="ac-staff-header__escalation-indicator" title={`${openEscalationsCount} open escalation requiring review`}><span aria-hidden="true">⚠️</span><span>{openEscalationsCount} Escalation</span></NavLink>}
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{displayRole}</div>
          <Button variant="secondary" size="medium" onClick={handleSignOut}>Sign Out</Button>
        </div>
      </div>
      <nav className="ac-staff-header__nav-bar container-wide" aria-label="Staff Portal Navigation">
        <ul className="ac-staff-header__nav-list">
          <li><NavLink to="/staff" end className={({ isActive }) => `ac-staff-header__nav-link ${isActive ? 'ac-staff-header__nav-link--active' : ''}`}><span aria-hidden="true">📊</span><span>Dashboard</span></NavLink></li>
          <li><NavLink to="/staff/appointments" className={({ isActive }) => `ac-staff-header__nav-link ${isActive ? 'ac-staff-header__nav-link--active' : ''}`}><span aria-hidden="true">📅</span><span>Appointments</span></NavLink></li>
          <li><NavLink to="/staff/appointment-requests" className={({ isActive }) => `ac-staff-header__nav-link ${isActive ? 'ac-staff-header__nav-link--active' : ''}`}><span aria-hidden="true">📝</span><span>Appointment Requests</span></NavLink></li>
          <li><NavLink to="/staff/escalations" className={({ isActive }) => `ac-staff-header__nav-link ${isActive ? 'ac-staff-header__nav-link--active' : ''}`}><span aria-hidden="true">⚠️</span><span>Escalations</span>{openEscalationsCount > 0 && <span className="ac-staff-header__badge-count">{openEscalationsCount}</span>}</NavLink></li>
        </ul>
      </nav>
    </header>
  );
};

export default StaffHeader;
