import type { StreamActivity } from '../utils/chatStream';
import './AgentActivityPanel.css';

export interface ActivityLine extends StreamActivity {
  id: string;
}

interface AgentActivityPanelProps {
  activities: ActivityLine[];
  thinking: string;
  streamingText: string;
  active: boolean;
}

export default function AgentActivityPanel({
  activities,
  thinking,
  streamingText,
  active
}: AgentActivityPanelProps) {
  if (!active && activities.length === 0 && !thinking && !streamingText) return null;

  return (
    <div className="agent-activity-panel slide-in">
      <div className="agent-activity-header">
        <span className="status-dot green pulse" />
        <span>Agent activity</span>
      </div>

      {activities.length > 0 && (
        <ul className="agent-activity-list">
          {activities.map(a => (
            <li key={a.id} className={`agent-activity-item agent-activity-item--${a.kind}`}>
              <span className="agent-activity-kind">{activityIcon(a)}</span>
              <span className="agent-activity-text">
                {a.path ? <code className="mono">{a.path}</code> : a.message}
                {a.path && a.status && a.status !== 'checking' && (
                  <span className={`agent-activity-file-status agent-activity-file-status--${a.status}`}>
                    {a.status}
                  </span>
                )}
                {a.path && a.status === 'checking' && (
                  <span className="agent-activity-file-status">checking…</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {thinking && (
        <details className="agent-activity-thinking" open>
          <summary>Reasoning</summary>
          <pre>{thinking}</pre>
        </details>
      )}

      {streamingText && (
        <div className="agent-activity-stream">
          <span className="agent-activity-stream-label">Composing reply…</span>
          <div className="agent-activity-stream-preview">{streamingText}</div>
        </div>
      )}
    </div>
  );
}

function activityIcon(a: StreamActivity): string {
  if (a.kind === 'file') return '▸';
  if (a.kind === 'commit') return '⎇';
  if (a.kind === 'status') return '◆';
  return '•';
}
