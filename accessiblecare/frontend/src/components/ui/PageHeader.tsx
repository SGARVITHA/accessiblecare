import React from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`ac-page-header ${className}`}>
      <div className="ac-page-header__content">
        {eyebrow && <span className="ac-page-header__eyebrow">{eyebrow}</span>}
        <h1 className="ac-page-header__title">{title}</h1>
        {description && (
          <p className="ac-page-header__description">{description}</p>
        )}
      </div>
      {action && <div className="ac-page-header__action">{action}</div>}
    </div>
  );
};

export default PageHeader;
