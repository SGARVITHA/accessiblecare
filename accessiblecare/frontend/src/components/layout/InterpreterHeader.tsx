import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { interpreterService } from '../../services/interpreterService';
import type { InterpreterDutyStatus, InterpreterProfile } from '../../types/interpreter';
import './InterpreterHeader.css';

export const InterpreterHeader: React.FC = () => {
  const { backendUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<InterpreterProfile | null>(null);
  const [dutyStatus, setDutyStatus] = useState<InterpreterDutyStatus>('AVAILABLE');

  useEffect(() => {
    let active = true;
    interpreterService.getProfile().then((p) => {
      if (active) {
        setProfile(p);
        setDutyStatus(p.active_status);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleDutyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as InterpreterDutyStatus;
    setDutyStatus(newStatus);
    const updated = await interpreterService.updateDutyStatus(newStatus);
    setProfile(updated);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const displayName = profile?.full_name || backendUser?.full_name || 'Anitha Rajan';
  const displayCert = profile?.certification_level || 'Certified ISL Interpreter (Level 3)';

  return (
    <header className="ac-interpreter-header">
      <div className="ac-interpreter-header__top">
        <div className="ac-interpreter-header__brand">
          <NavLink to="/interpreter" className="ac-interpreter-header__logo">
            <div className="ac-interpreter-header__title">
              <span>AccessibleCare</span>
              <span className="ac-interpreter-header__badge">Interpreter Portal</span>
            </div>
            <span className="ac-interpreter-header__tagline">
              Certified Language Services & Remote VRI
            </span>
          </NavLink>
        </div>

        <div className="ac-interpreter-header__user-actions">
          {/* Live Duty Status Control */}
          <div
            className="ac-interpreter-header__duty-control"
            title="Update your active dispatch readiness"
          >
            <span
              className={`ac-interpreter-header__duty-dot ac-interpreter-header__duty-dot--${dutyStatus.toLowerCase()}`}
              aria-hidden="true"
            />
            <span className="ac-interpreter-header__duty-label">Status:</span>
            <select
              aria-label="Interpreter Duty Status"
              className="ac-interpreter-header__duty-select"
              value={dutyStatus}
              onChange={handleDutyChange}
            >
              <option value="AVAILABLE">Available (Active Dispatch)</option>
              <option value="ON_CALL">On Call (Backup Only)</option>
              <option value="BUSY">Busy (In Session)</option>
              <option value="OFF_DUTY">Off Duty</option>
            </select>
          </div>

          <div className="ac-interpreter-header__user-info">
            <span className="ac-interpreter-header__user-name">{displayName}</span>
            <span className="ac-interpreter-header__user-cert">{displayCert}</span>
          </div>

          <Button variant="secondary" size="small" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>

      <nav
        className="ac-interpreter-header__nav-bar"
        aria-label="Interpreter Primary Navigation"
      >
        <div className="ac-interpreter-header__nav-inner">
          <ul className="ac-interpreter-header__nav-list">
            <li>
              <NavLink
                to="/interpreter"
                end
                className={({ isActive }) =>
                  `ac-interpreter-header__nav-link ${
                    isActive ? 'ac-interpreter-header__nav-link--active' : ''
                  }`
                }
              >
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/interpreter/requests"
                className={({ isActive }) =>
                  `ac-interpreter-header__nav-link ${
                    isActive ? 'ac-interpreter-header__nav-link--active' : ''
                  }`
                }
              >
                Requests
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/interpreter/assignments"
                className={({ isActive }) =>
                  `ac-interpreter-header__nav-link ${
                    isActive ? 'ac-interpreter-header__nav-link--active' : ''
                  }`
                }
              >
                Assignments
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/interpreter/availability"
                className={({ isActive }) =>
                  `ac-interpreter-header__nav-link ${
                    isActive ? 'ac-interpreter-header__nav-link--active' : ''
                  }`
                }
              >
                Availability
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default InterpreterHeader;
