import { useState } from 'react';
import axios from 'axios';

import ChatWindow from './components/ChatWindow';
import IncidentCard from './components/IncidentCard';

export default function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message) return;

    setMessages(prev => [...prev, `User: ${message}`]);

    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/incidents/create',
        {
          message,
        }
      );

      setIncident(response.data.incident);

      setMessages(prev => [
        ...prev,
        `AI: Incident ${response.data.incident.number} created successfully.`
      ]);
    } catch (err) {
      console.error(err);

      setMessages(prev => [
        ...prev,
        'AI: Failed to create incident.'
      ]);
    }

    setLoading(false);
    setMessage('');
  };

  return (
    <div className="app">
      <div className="sidebar">
        <h2>AI Service Desk</h2>

        <p>Enterprise AI Agent</p>
      </div>

      <div className="main">
        <div className="chat-container">
          <ChatWindow messages={messages} />

          <IncidentCard incident={incident} />
        </div>

        <div className="input-container">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue..."
          />

          <button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Processing...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}