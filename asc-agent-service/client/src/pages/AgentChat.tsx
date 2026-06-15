import { useState, useRef, useEffect } from 'react';
import './AgentChat.css';

interface Message {
  role: 'user' | 'agent' | 'error';
  text: string;
}

const API_KEY = 'AIzaSyClOu7sMH4xHEU7DDHCuvJoVY8cWvuMKt4';
const MODEL = 'gemini-2.5-flash';
const SYSTEM_PROMPT = `You are the ASC Agent (Automated Software Contractor), a specialized AI engineer designed to assist with software development tasks within the ASC platform. Your primary capabilities include:
1. Analyzing codebases and products onboarded to the platform.
2. Generating technical task briefs and acceptance criteria.
3. Writing code and opening draft Pull Requests via GitHub integration.
4. Monitoring system health and escalating critical issues to human reviewers.
5. Providing technical guidance on products like 'Meeting Genius' and other onboarded repositories.

You are professional, concise, and technically accurate. You have access to the system's state through the dashboard you are part of. When users ask about tasks or PRs, you guide them to use the specialized tabs (Task Intake, Pull Requests) while offering to help refine their technical requirements here.`;

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('asc_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'agent', text: 'Hello! I am the ASC Agent. I\'m ready to help you manage your software products, draft task briefs, or review pull requests. What can I do for you?' }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('asc_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            ...messages.filter(m => m.role !== 'error').map(m => ({
              role: m.role === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'Failed to get response from Gemini');
      }

      const agentText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I encountered an issue processing your request.';
      setMessages(prev => [...prev, { role: 'agent', text: agentText }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'error', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([{ role: 'agent', text: 'Chat cleared. How can I assist you now?' }]);
      localStorage.removeItem('asc_chat_history');
    }
  };

  const formatMessage = (text: string) => {
    // 1. Handle bolding: **text**
    // 2. Handle inline code: `text`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <div className="agent-chat fade-in">
      <div className="chat-header">
        <div className="agent-info">
          <span className="status-dot green" />
          <span className="agent-name">ASC Core Agent</span>
          <span className="model-badge">{MODEL}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role} slide-in`}>
            {formatMessage(m.text)}
          </div>
        ))}
        {isLoading && (
          <div className="typing-indicator">ASC Agent is analyzing and responding...</div>
        )}
      </div>

      <div className="chat-input-area">
        <input 
          type="text" 
          className="chat-input" 
          placeholder="Ask about your products, tasks, or GitHub PRs..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="btn btn-primary" onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
