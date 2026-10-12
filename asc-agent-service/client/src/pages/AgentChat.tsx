import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';
import './AgentChat.css';
import '../utils/chatMarkdown.css';
import { renderChatMarkdown } from '../utils/renderChatMarkdown';
import { consumeChatStream } from '../utils/chatStream';
import { upsertStreamActivity } from '../utils/streamActivity';
import AgentActivityPanel, { type ActivityLine } from '../components/AgentActivityPanel';
import '../components/AgentActivityPanel.css';

interface Message {
  role: 'user' | 'agent' | 'error';
  text: string;
  uiOnly?: boolean;
}

const WELCOME_MESSAGE = 'Hello! I am the ASC Agent. I\'m ready to help you manage your software products, draft task briefs, or review pull requests. What can I do for you?';
const CLEARED_MESSAGE = 'Chat cleared. How can I assist you now?';

const SYSTEM_PROMPT = `You are the ASC Agent (Automated Software Contractor), a specialized AI engineer designed to assist with software development tasks within the ASC platform. Your primary capabilities include:
1. Analyzing codebases and products onboarded to the platform.
2. Generating technical task briefs and acceptance criteria.
3. Writing code and opening draft Pull Requests via GitHub integration.
4. Monitoring system health and escalating critical issues to human reviewers.
5. Providing technical guidance on products like 'Meeting Genius' and other onboarded repositories.

You are professional, concise, and technically accurate. You have access to the system's state through the dashboard you are part of. When users ask about tasks or PRs, you guide them to use the specialized tabs (Task Intake, Pull Requests) while offering to help refine their technical requirements here.`;

export default function AgentChat() {
  const { activeLlm } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('asc_chat_history');
    return saved ? JSON.parse(saved) : [
      { role: 'agent', text: WELCOME_MESSAGE, uiOnly: true }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityLine[]>([]);
  const [liveThinking, setLiveThinking] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('asc_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, activities, streamingText, liveThinking]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    setActivities([]);
    setLiveThinking('');
    setStreamingText('');

    try {
      const history = messages
        .filter(m => m.role !== 'error' && !m.uiOnly)
        .filter(m => !(m.role === 'agent' && (m.text === WELCOME_MESSAGE || m.text === CLEARED_MESSAGE)))
        .map(m => ({
          role: m.role as 'user' | 'agent',
          text: m.text
        }));

      const response = await apiFetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          messages: history,
          userMessage
        })
      });

      const text = await consumeChatStream(response, {
        onActivity: item => setActivities(prev => upsertStreamActivity(prev, item)),
        onThinking: (_d, full) => setLiveThinking(full),
        onText: (_d, full) => setStreamingText(full)
      });

      setMessages(prev => [...prev, { role: 'agent', text }]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'error', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
      setActivities([]);
      setLiveThinking('');
      setStreamingText('');
    }
  };

  const clearChat = () => {
    if (confirm('Are you sure you want to clear the chat history?')) {
      setMessages([{ role: 'agent', text: CLEARED_MESSAGE, uiOnly: true }]);
      localStorage.removeItem('asc_chat_history');
    }
  };

  return (
    <div className="agent-chat fade-in">
      <div className="chat-header">
        <div className="agent-info">
          <span className="status-dot green" />
          <span className="agent-name">ASC Core Agent</span>
          <span className="model-badge">{activeLlm || 'No AI configured'}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={clearChat}>Clear Chat</button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role} slide-in${m.role === 'agent' ? ' message--rich' : ''}`}>
            {m.role === 'user' ? m.text : renderChatMarkdown(m.text)}
          </div>
        ))}
        {isLoading && (
          <AgentActivityPanel
            active={isLoading}
            activities={activities}
            thinking={liveThinking}
            streamingText={streamingText}
          />
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
