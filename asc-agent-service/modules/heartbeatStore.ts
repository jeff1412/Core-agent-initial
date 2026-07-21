'use strict';

/**
 * modules/heartbeatStore.ts — Persist heartbeat report history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductHeartbeat } from './repoHeartbeat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '..', 'heartbeat-history.json');
const MAX_REPORTS = 30;

export interface HeartbeatReport {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  products: ProductHeartbeat[];
  aiReport: string | null;
  aiError: string | null;
}

interface HeartbeatStore {
  reports: HeartbeatReport[];
}

function readStore(): HeartbeatStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('[Heartbeat Store] Could not read history file, starting fresh');
  }
  return { reports: [] };
}

function writeStore(store: HeartbeatStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function saveReport(report: HeartbeatReport): HeartbeatReport {
  const store = readStore();
  store.reports.unshift(report);
  store.reports = store.reports.slice(0, MAX_REPORTS);
  writeStore(store);
  return report;
}

export function getLatestReport(): HeartbeatReport | null {
  const store = readStore();
  return store.reports[0] || null;
}

export function getReportHistory(limit = 10): HeartbeatReport[] {
  const store = readStore();
  return store.reports.slice(0, limit);
}

export function getReportById(id: string): HeartbeatReport | null {
  const store = readStore();
  return store.reports.find(r => r.id === id) || null;
}
