import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { Appointment, InterpreterStatus, QuickMessage } from '../../types/patient';
import './QuickCommunicationPage.css';

interface RoutinePreset {
  id: string;
  category: 'arrival' | 'navigation' | 'help' | 'general';
  icon: string;
  title: string;
  text: string;
}

const ROUTINE_PRESETS: RoutinePreset[] = [
  {
    id: 'p1',
    category: 'arrival',
    icon: '📍',
    title: 'Arrived at Reception',
    text: 'Hello, I have arrived for my appointment (MRN: P1024). I communicate using Indian Sign Language.',
  },
  {
    id: 'p2',
    category: 'navigation',
    icon: '🧭',
    title: 'Request Wayfinding',
    text: 'Please show me the way to Outpatient Block B, Room 204.',
  },
  {
    id: 'p3',
    category: 'help',
    icon: '🤟',
    title: 'Where is my Interpreter?',
    text: 'Can you please check if my ISL interpreter (Anitha Rajan) has arrived at reception?',
  },
  {
    id: 'p4',
    category: 'general',
    icon: '⏳',
    title: 'Wait Time Inquiry',
    text: 'Could you please show me my current estimated waiting time on the screen?',
  },
];

export const QuickCommunicationPage: React.FC = () => {
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [interpreterStatus, setInterpreterStatus] = useState<InterpreterStatus | null>(null);
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    async function loadContext() {
      try {
        const [apptData, interpData] = await Promise.all([
          patientService.getAppointment('A501'),
          patientService.getInterpreterStatus('A501'),
        ]);
        setAppointment(apptData);
        setInterpreterStatus(interpData);
      } catch (err) {
        console.error('Failed to load communication context:', err);
      }
    }
    loadContext();
  }, []);

  const handleSend = async (category: 'arrival' | 'navigation' | 'help' | 'general', textToSend: string) => {
    if (!textToSend.trim()) return;
    try {
      setSending(true);
      const newMsg = await patientService.sendQuickCommunication(category, textToSend);
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
    } catch (err) {
      console.error('Failed to send quick message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-communication-page">
      <PageHeader
        eyebrow="Routine Hospital Communication Assistance"
        title="Quick Communication"
        description="Communicate routine questions and check-in details with hospital reception staff."
      />

      {/* High-Risk Clinical Communication Boundary Notice */}
      <div className="clinical-boundary-notice" role="note">
        <span className="notice-icon">ℹ️</span>
        <div className="notice-text">
          <strong>Routine Communication Only</strong>
          <p>
            This tool is for routine hospital desk questions (reception check-in, room location, waiting time).
            For medical discussions, diagnosis, treatment, and clinical procedures, your certified ISL interpreter is required.
          </p>
        </div>
      </div>

      <div className="comm-layout-grid">
        {/* Main Communication Panel */}
        <div className="comm-main-panel">
          {/* Quick Phrase Cards */}
          <Card padding="large">
            <h2 className="panel-title">Routine Communication Phrases</h2>
            <p className="panel-subtitle">Tap any phrase to instantly present it to hospital staff.</p>

            <div className="presets-grid">
              {ROUTINE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-card"
                  onClick={() => handleSend(preset.category, preset.text)}
                  disabled={sending}
                >
                  <span className="preset-icon">{preset.icon}</span>
                  <div className="preset-text-content">
                    <strong>{preset.title}</strong>
                    <span>"{preset.text}"</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Active Message Conversation Display */}
          <Card padding="large">
            <h2 className="panel-title">Active Desk Communication</h2>
            
            <div className="message-history">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <p>No messages sent yet. Select a routine phrase above or type below to communicate with staff.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="message-bubble patient-bubble">
                    <div className="bubble-header">
                      <span className="bubble-sender">You (Patient)</span>
                      <span className="bubble-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="bubble-text">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            {/* Custom Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend('general', inputText);
              }}
              className="message-input-area"
            >
              <input
                type="text"
                className="custom-msg-input"
                placeholder="Type custom note or question for reception staff..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
              />
              <Button variant="primary" type="submit" disabled={sending || !inputText.trim()}>
                {sending ? 'Displaying...' : 'Display Note'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Sidebar Context Rail */}
        <div className="comm-side-rail">
          <Card padding="medium">
            <h3 className="side-title">Visit Summary Context</h3>
            {appointment ? (
              <div className="mini-summary">
                <div className="summary-item">
                  <span className="summary-label">Doctor</span>
                  <span className="summary-val">{appointment.doctor_name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Department</span>
                  <span className="summary-val">{appointment.department}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Location</span>
                  <span className="summary-val">{appointment.location}</span>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Loading appointment summary...</p>
            )}
          </Card>

          <Card padding="medium">
            <h3 className="side-title">Interpreter Support</h3>
            {interpreterStatus ? (
              <div className="interp-summary">
                <div className="summary-item">
                  <span className="summary-label">Interpreter</span>
                  <span className="summary-val">{interpreterStatus.interpreter_name || 'Assigned Specialist'}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Mode</span>
                  <span className="summary-val">{interpreterStatus.communication_mode === 'IN_PERSON' ? 'In-Person' : 'Remote VRI'}</span>
                </div>
                <Button
                  variant="ghost"
                  fullWidth
                  style={{ marginTop: 'var(--space-3)' }}
                  onClick={() => navigate('/patient/interpreter')}
                >
                  Interpreter Status Screen
                </Button>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Loading interpreter status...</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickCommunicationPage;
