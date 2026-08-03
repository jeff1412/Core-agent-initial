'use strict';

/**
 * modules/taskStore.ts — Persistent task intake history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '..', 'task-history.json');
const MAX_TASKS = 200;

export type TaskStatus =
  | 'pending'
  | 'processing'
  | 'validation_failed'
  | 'escalated'
  | 'pr_created'
  | 'failed';

export interface TaskRecord {
  id: string;
  postId: string;
  source: 'web-form' | 'mattermost';
  submittedBy: string | null;
  submittedAt: string;
  updatedAt: string;
  status: TaskStatus;
  product: string;
  taskType: string;
  priority: string;
  description: string;
  acceptanceCriteria: string;
  doNotTouch: string;
  referenceFiles: string;
  prUrl: string | null;
  error: string | null;
  missingFields: string[] | null;
  escalationReason: string | null;
}

interface TaskStore {
  tasks: TaskRecord[];
}

function readStore(): TaskStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {
    console.warn('[Task Store] Could not read history, starting fresh');
  }
  return { tasks: [] };
}

function writeStore(store: TaskStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function createTask(input: {
  postId: string;
  source: 'web-form' | 'mattermost';
  submittedBy?: string | null;
  product: string;
  taskType: string;
  priority: string;
  description: string;
  acceptanceCriteria: string;
  doNotTouch?: string;
  referenceFiles?: string;
}): TaskRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const task: TaskRecord = {
    id: `task-${Date.now().toString(36)}`,
    postId: input.postId,
    source: input.source,
    submittedBy: input.submittedBy || null,
    submittedAt: now,
    updatedAt: now,
    status: 'pending',
    product: input.product,
    taskType: input.taskType,
    priority: input.priority,
    description: input.description,
    acceptanceCriteria: input.acceptanceCriteria,
    doNotTouch: input.doNotTouch || '',
    referenceFiles: input.referenceFiles || '',
    prUrl: null,
    error: null,
    missingFields: null,
    escalationReason: null
  };
  store.tasks.unshift(task);
  store.tasks = store.tasks.slice(0, MAX_TASKS);
  writeStore(store);
  return task;
}

export function updateTask(postId: string, update: Partial<TaskRecord>): TaskRecord | null {
  const store = readStore();
  const idx = store.tasks.findIndex(t => t.postId === postId);
  if (idx === -1) return null;
  store.tasks[idx] = {
    ...store.tasks[idx],
    ...update,
    updatedAt: new Date().toISOString()
  };
  writeStore(store);
  return store.tasks[idx];
}

export function getTaskHistory(limit = 50): TaskRecord[] {
  return readStore().tasks.slice(0, limit);
}

export function getTaskById(id: string): TaskRecord | null {
  return readStore().tasks.find(t => t.id === id) || null;
}

export function getTaskByPostId(postId: string): TaskRecord | null {
  return readStore().tasks.find(t => t.postId === postId) || null;
}
