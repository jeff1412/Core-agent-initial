import type { StreamActivity } from './chatStream';
import type { ActivityLine } from '../components/AgentActivityPanel';

export function upsertStreamActivity(prev: ActivityLine[], item: StreamActivity): ActivityLine[] {
  if (item.kind === 'file' && item.path) {
    const idx = prev.findIndex(p => p.kind === 'file' && p.path === item.path);
    const line: ActivityLine = { ...item, id: idx >= 0 ? prev[idx].id : newActivityId() };
    if (idx >= 0) {
      const next = [...prev];
      next[idx] = line;
      return next;
    }
    return [...prev, line];
  }
  return [...prev, { ...item, id: newActivityId() }];
}

function newActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
