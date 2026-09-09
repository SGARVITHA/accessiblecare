import { Outlet } from 'react-router-dom';
import InterpreterHeader from '../components/layout/InterpreterHeader';

export default function InterpreterLayout() {
  return (
    <div
      data-layout="interpreter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <InterpreterHeader />
      <main
        id="main-content"
        style={{
          flex: 1,
          padding: 'var(--space-6) var(--space-6)',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
