'use strict';

/**
 * modules/codeAuditStore.ts — Persist code audit report history
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProductCodeSnapshot } from './codeAuditScanner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, '..', 'code-audit-history.json');
const MAX_REPORTS = 30;

export interface CodeAuditReport {
  id: string;
  generatedAt: string;
  trigger: 'manual' | 'scheduled';
  products: ProductCodeSnapshot[];
  aiReport: string | null;
  aiError: string | null;
}

interface CodeAuditStore {
  reports: CodeAuditReport[];
}

function readStore(): CodeAuditStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    }
  } catch {
    console.warn('[Code Audit Store] Could not read history, starting fresh');
  }
  return { reports: [] };
}

function writeStore(store: CodeAuditStore): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

export function saveCodeAuditReport(report: CodeAuditReport): CodeAuditReport {
  const store = readStore();
  store.reports.unshift(report);
  store.reports = store.reports.slice(0, MAX_REPORTS);
  writeStore(store);
  return report;
}

export function getLatestCodeAuditReport(): CodeAuditReport | null {
  const store = readStore();
  return store.reports[0] || null;
}

export function getCodeAuditHistory(limit = 10): CodeAuditReport[] {
  return readStore().reports.slice(0, limit);
}

export function getCodeAuditReportById(id: string): CodeAuditReport | null {
  return readStore().reports.find(r => r.id === id) || null;
}
