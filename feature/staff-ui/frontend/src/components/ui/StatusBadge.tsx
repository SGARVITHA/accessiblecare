import React from 'react';
import './Badge.css';

export type StatusVariant =
  | 'confirmed'
  | 'ready'
  | 'pending'
  | 'action_required'
  | 'unavailable'
  | 'info'
  | 'coordinating'
  | 'escalated'
  | 'checked_in'
  | 'cancelled';

export interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusVariant,
  { defaultLabel: string; icon: string; className: string }
> = {
  confirmed: {
    defaultLabel: 'Confirmed',
    icon: '✓',
    className: 'ac-badge--success',
  },
  ready: {
    defaultLabel: 'Ready',
    icon: '✓',
    className: 'ac-badge--success',
  },
  checked_in: {
    defaultLabel: 'Checked In',
    icon: '✓',
    className: 'ac-badge--success',
  },
  pending: {
    defaultLabel: 'Pending',
    icon: '⏳',
    className: 'ac-badge--warning',
  },
  coordinating: {
    defaultLabel: 'Coordinating',
    icon: '⏳',
    className: 'ac-badge--info',
  },
  action_required: {
    defaultLabel: 'Action Required',
    icon: '⚠️',
    className: 'ac-badge--alert',
  },
  escalated: {
    defaultLabel: 'Escalated',
    icon: '⚠️',
    className: 'ac-badge--alert',
  },
  unavailable: {
    defaultLabel: 'Unavailable',
    icon: '✕',
    className: 'ac-badge--neutral',
  },
  cancelled: {
    defaultLabel: 'Cancelled',
    icon: '✕',
    className: 'ac-badge--alert',
  },
  info: {
    defaultLabel: 'Information',
    icon: 'ℹ',
    className: 'ac-badge--info',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.info;
  const displayLabel = label || config.defaultLabel;

  return (
    <span className={`ac-badge ${config.className} ${className}`}>
      <span className="ac-badge__icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="ac-badge__label">{displayLabel}</span>
    </span>
  );
};

export default StatusBadge;
