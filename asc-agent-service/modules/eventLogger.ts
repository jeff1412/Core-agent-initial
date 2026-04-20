'use strict';

/**
 * modules/eventLogger.ts — Dashboard Activity logger
 */

export interface AgentEvent {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  metadata: any;
}

let eventHistory: AgentEvent[] = [];
const MAX_EVENTS = 100;

export function logEvent(type: 'info' | 'success' | 'warning' | 'error', message: string, metadata = {}) {
  const event: AgentEvent = {
    id: Date.now() + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    type,
    message,
    metadata
  };

  eventHistory.unshift(event);
  if (eventHistory.length > MAX_EVENTS) {
    eventHistory.pop();
  }

  console.log(`[Event] [${type.toUpperCase()}] ${message}`);
}

export function getEvents(): AgentEvent[] {
  return eventHistory;
}
