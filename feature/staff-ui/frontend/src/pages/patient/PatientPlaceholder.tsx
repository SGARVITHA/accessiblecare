import React from 'react';
import { PageHeader, Card, Button } from '../../components/ui';
import { useNavigate } from 'react-router-dom';

export interface PatientPlaceholderProps {
  title: string;
  description: string;
}

export const PatientPlaceholder: React.FC<PatientPlaceholderProps> = ({
  title,
  description,
}) => {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        eyebrow="Patient Portal Foundation"
        title={title}
        description={description}
      />
      <Card padding="large">
        <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-2)' }}>
            Screen Implementation Pending
          </h2>
          <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: 'var(--space-6)' }}>
            The foundation for this patient screen is established. Full implementation will follow in the next phase.
          </p>
          <Button variant="primary" onClick={() => navigate('/patient')}>
            Return to Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PatientPlaceholder;
