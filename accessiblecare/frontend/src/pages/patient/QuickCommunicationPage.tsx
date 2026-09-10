import React, { useState } from 'react';
import { PageHeader, Card, Button } from '../../components/ui';
import patientService from '../../services/patientService';
import type { QuickMessage } from '../../types/patient';
import './QuickCommunicationPage.css';

interface RoutinePreset {
  id: string;
  category: 'arrival' | 'navigation' | 'help' | 'general';
  icon: string;
  title: string;
  text: string;
}

const ROUTINE_PRESETS: RoutinePreset[] = [
  { id: 'p1', category: 'arrival', icon: '📍', title: 'Arrived at Reception', text: 'Hello, I have arrived for my appointment. I communicate using Indian Sign Language.' },
  { id: 'p2', category: 'navigation', icon: '🧭', title: 'Request Wayfinding', text: 'Please show me the way to my appointment location.' },
  { id: 'p3', category: 'help', icon: '🤟', title: 'Request Accessibility Assistance', text: 'Please help me with my accessibility arrangements.' },
  { id: 'p4', category: 'general', icon: '⏳', title: 'Wait Time Inquiry', text: 'Could you please show me my current estimated waiting time?' },
];

export const QuickCommunicationPage: React.FC = () => {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (category: 'arrival' | 'navigation' | 'help' | 'general', textToSend: string) => {
    if (!textToSend.trim()) return;
    try {
      setSending(true);
      const newMsg = await patientService.sendQuickCommunication(category, textToSend.trim());
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="quick-communication-page">
      <PageHeader
        eyebrow="Routine Hospital Communication Assistance"
        title="Quick Communication"
        description="Prepare routine questions and notes for reception or other non-clinical hospital desk interactions."
      />

      <div className="clinical-boundary-notice" role="note">
        <span className="notice-icon" aria-hidden="true">ℹ️</span>
        <div className="notice-text">
          <strong>Routine Communication Only</strong>
          <p>
            This tool is for routine hospital desk questions such as reception, wayfinding, and waiting time. For medical discussions, diagnosis, treatment, and clinical procedures, qualified interpretation is required.
          </p>
        </div>
      </div>

      <div className="clinical-boundary-notice" role="status">
        <span className="notice-icon" aria-hidden="true">ℹ️</span>
        <div className="notice-text">
          <strong>Demo / Local Mode</strong>
          <p>Messages are currently displayed only in this browser session. They are not delivered to hospital staff.</p>
        </div>
      </div>

      <div className="comm-layout-grid">
        <div className="comm-main-panel">
          <Card padding="large">
            <h2 className="panel-title">Routine Communication Phrases</h2>
            <p className="panel-subtitle">Select a phrase to display it in the local demo conversation.</p>

            <div className="presets-grid">
              {ROUTINE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="preset-card"
                  onClick={() => void handleSend(preset.category, preset.text)}
                  disabled={sending}
                >
                  <span className="preset-icon" aria-hidden="true">{preset.icon}</span>
                  <div className="preset-text-content">
                    <strong>{preset.title}</strong>
                    <span>"{preset.text}"</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card padding="large">
            <h2 className="panel-title">Local Demo Conversation</h2>
            <div className="message-history">
              {messages.length === 0 ? (
                <div className="empty-messages">
                  <p>No local messages yet. Select a routine phrase above or type a note below.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="message-bubble patient-bubble">
                    <div className="bubble-header">
                      <span className="bubble-sender">You</span>
                      <span className="bubble-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="bubble-text">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend('general', inputText);
              }}
              className="message-input-area"
            >
              <input
                type="text"
                className="custom-msg-input"
                placeholder="Type a routine note or question..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={sending}
                aria-label="Routine communication note"
              />
              <Button variant="primary" type="submit" disabled={sending || !inputText.trim()}>
                {sending ? 'Displaying...' : 'Display Note'}
              </Button>
            </form>
          </Card>
        </div>

        <div className="comm-side-rail">
          <Card padding="medium">
            <h3 className="side-title">Current Scope</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
              Quick Communication is currently a local/demo presentation tool. No patient, appointment, room, or interpreter identity is assumed by this screen.
            </p>
          </Card>

          <Card padding="medium">
            <h3 className="side-title">Clinical Communication</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>
              Do not use this demo for clinical decisions or treatment discussions. Qualified interpretation remains required for clinical communication.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuickCommunicationPage;
