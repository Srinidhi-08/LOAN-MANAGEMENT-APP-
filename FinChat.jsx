// src/components/Chatbot.jsx
import React, { useState } from 'react';
import { sendChatMessage } from '../api';

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: 'bot', text: '👋 Hi! I’m your financial assistant. How can I help you today?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendChatMessage(input);
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Sorry, I couldn’t respond. Try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '400px', padding: 20, border: '1px solid #ccc', borderRadius: 10 }}>
      <div style={{ height: '300px', overflowY: 'auto', marginBottom: 10 }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ textAlign: msg.role === 'bot' ? 'left' : 'right', margin: '8px 0' }}>
            <div style={{
              display: 'inline-block',
              background: msg.role === 'bot' ? '#f1f1f1' : '#cfe9ff',
              padding: '10px 14px',
              borderRadius: '10px',
              maxWidth: '80%',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'left', color: '#888' }}>Typing...</div>}
      </div>
      <div style={{ display: 'flex' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me something..."
          style={{ flex: 1, padding: 10 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} style={{ marginLeft: 10, padding: '10px 16px' }}>Send</button>
      </div>
    </div>
  );
}