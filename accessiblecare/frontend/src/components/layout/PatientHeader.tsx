import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import './PatientHeader.css';

export interface PatientHeaderProps {
  userFullName?: string;
  userRole?: string;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  userFullName,
  userRole,
}) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = userFullName || 'Patient';
  const displayRole = userRole || 'PATIENT';

  return (
    <header className="ac-patient-header">
      <div className="ac-patient-header__top container-wide">
        <div className="ac-patient-header__brand">
          <NavLink to="/patient" className="ac-patient-header__logo">
            <span className="ac-patient-header__title">AccessibleCare</span>
            <span className="ac-patient-header__tagline">
              Accessible communication, coordinated care
            </span>
          </NavLink>
        </div>

        <div className="ac-patient-header__user-actions">
          <div className="ac-patient-header__accessibility-badge" title="Visual Reception & Queue Alert System Active">
            <span className="ac-patient-header__status-dot" aria-hidden="true" />
            <span className="ac-patient-header__status-text">Visual Alerts Active</span>
          </div>

          <div className="ac-patient-header__user-info">
            <span className="ac-patient-header__user-name">{displayName}</span>
            <span className="ac-patient-header__user-role">{displayRole}</span>
          </div>

          <Button variant="secondary" size="medium" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <nav className="ac-patient-header__nav-bar container-wide" aria-label="Patient Portal Navigation">
        <ul className="ac-patient-header__nav-list">
          <li>
            <NavLink
              to="/patient"
              end
              className={({ isActive }) =>
                `ac-patient-header__nav-link ${isActive ? 'ac-patient-header__nav-link--active' : ''}`
              }
            >
              Home
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/patient/appointments"
              className={({ isActive }) =>
                `ac-patient-header__nav-link ${isActive ? 'ac-patient-header__nav-link--active' : ''}`
              }
            >
              Appointments
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/patient/accessibility"
              className={({ isActive }) =>
                `ac-patient-header__nav-link ${isActive ? 'ac-patient-header__nav-link--active' : ''}`
              }
            >
              Accessibility
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/patient/interpreter"
              className={({ isActive }) =>
                `ac-patient-header__nav-link ${isActive ? 'ac-patient-header__nav-link--active' : ''}`
              }
            >
              Interpreter Status
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/patient/communication"
              className={({ isActive }) =>
                `ac-patient-header__nav-link ${isActive ? 'ac-patient-header__nav-link--active' : ''}`
              }
            >
              Quick Communication
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default PatientHeader;
