import React from 'react';
import { Card } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { PatientNotification } from '../../../types/patient';
import './DashboardReminders.css';

export interface DashboardRemindersProps {
  notifications?: PatientNotification[];
}

export const DashboardReminders: React.FC<DashboardRemindersProps> = ({
  notifications = [],
}) => {
  if (!notifications || notifications.length === 0) {
    return null;
  }

  return (
    <Card padding="large" className="ac-reminders-card">
      <div className="ac-reminders-card__header">
        <h3 className="ac-reminders-card__title">Visit Reminders & Notifications</h3>
        <span className="ac-reminders-card__count">{notifications.length} Active</span>
      </div>

      <div className="ac-reminders-card__list">
        {notifications.map((notif) => (
          <div key={notif.id} className="ac-reminders-card__item">
            <div className="ac-reminders-card__item-header">
              <StatusBadge
                status={notif.type === 'success' ? 'confirmed' : 'info'}
                label={notif.title}
              />
              <span className="ac-reminders-card__time">{notif.timestamp}</span>
            </div>
            <p className="ac-reminders-card__message">{notif.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DashboardReminders;
