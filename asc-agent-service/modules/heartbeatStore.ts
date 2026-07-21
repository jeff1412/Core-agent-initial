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

function normalizeProduct(raw: Partial<ProductHeartbeat> & { productId?: string; productName?: string }): ProductHeartbeat {
  return {
    productId: raw.productId || '',
    productName: raw.productName || 'Unknown',
    owner: raw.owner || '',
    repo: raw.repo || '',
    status: raw.status || 'red',
    reachable: raw.reachable ?? false,
    defaultBranch: raw.defaultBranch ?? null,
    lastCommit: raw.lastCommit ?? null,
    openPrCount: raw.openPrCount ?? 0,
    stalePrCount: raw.stalePrCount ?? 0,
    ci: raw.ci ?? { available: false, conclusion: null, runAt: null },
    issues: Array.isArray(raw.issues) ? raw.issues : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    openPrs: Array.isArray(raw.openPrs) ? raw.openPrs : [],
    commitsLast7Days: raw.commitsLast7Days ?? 0
  };
}

function normalizeReport(raw: Partial<HeartbeatReport> & { id?: string }): HeartbeatReport {
  return {
    id: raw.id || '',
    generatedAt: raw.generatedAt || new Date().toISOString(),
    trigger: raw.trigger === 'scheduled' ? 'scheduled' : 'manual',
    products: Array.isArray(raw.products) ? raw.products.map(normalizeProduct) : [],
    aiReport: raw.aiReport ?? null,
    aiError: raw.aiError ?? null
  };
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
  const raw = store.reports[0];
  return raw ? normalizeReport(raw) : null;
}

export function getReportHistory(limit = 10): HeartbeatReport[] {
  const store = readStore();
  return store.reports.slice(0, limit).map(normalizeReport);
}

export function getReportById(id: string): HeartbeatReport | null {
  const store = readStore();
  const raw = store.reports.find(r => r.id === id);
  return raw ? normalizeReport(raw) : null;
}
