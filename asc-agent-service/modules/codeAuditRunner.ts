'use strict';

/**
 * modules/codeAuditRunner.ts — Orchestrates code file scan, AI review, and persistence
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAllProductCode } from './codeAuditScanner';
import {
  generateCodeAuditReport,
  fallbackCodeAuditReport,
  streamCodeAuditReport
} from './codeAuditReporter';
import { saveCodeAuditReport, CodeAuditReport } from './codeAuditStore';
import { OnboardedProduct } from './productVersionService';
import { buildProductVersionReleaseAnalysis } from './auditVersionAnalysis';
import { CodeAuditActivityHandler } from './codeAuditProgress';
import { LlmStreamEvent } from './llmClient';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let running = false;

function loadProducts(): OnboardedProduct[] {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'products.json'), 'utf-8'));
}

export interface CodeAuditRunHooks {
  onActivity?: CodeAuditActivityHandler;
  onLlmStream?: (ev: LlmStreamEvent) => void;
}

export async function runCodeAudit(
  trigger: 'manual' | 'scheduled' = 'manual',
  hooks?: CodeAuditRunHooks
): Promise<CodeAuditReport> {
  if (running) {
    throw new Error('A code audit is already in progress. Please wait.');
  }

  running = true;
  console.log(`\n[Code Audit] Starting ${trigger} code review...`);

  const emit = hooks?.onActivity;

  try {
    emit?.({ kind: 'status', message: 'Starting code audit…' });
    const products = loadProducts();

    emit?.({ kind: 'step', message: `Loading ${products.length} onboarded product(s) from GitHub…` });
    const snapshots = await scanAllProductCode(products, emit);

    const versionReleaseAnalysis = await buildProductVersionReleaseAnalysis(products, 2, emit);

    let aiReport: string | null = null;
    let aiError: string | null = null;

    const scannable = snapshots.filter(s => s.filesScanned > 0);
    if (scannable.length === 0) {
      emit?.({ kind: 'step', message: 'No scannable files — generating fallback report' });
      aiReport = fallbackCodeAuditReport(snapshots);
      aiError = 'No source files could be scanned';
    } else if (hooks?.onLlmStream) {
      emit?.({ kind: 'step', message: 'Generating AI code review (streaming)…' });
      try {
        const parts: string[] = [];
        for await (const ev of streamCodeAuditReport(snapshots, versionReleaseAnalysis)) {
          hooks.onLlmStream!(ev);
          if (ev.type === 'text') parts.push(ev.delta);
        }
        aiReport = parts.join('') || null;
        if (!aiReport) {
          throw new Error('Empty AI report');
        }
      } catch (e: any) {
        aiError = e.message;
        aiReport = fallbackCodeAuditReport(snapshots);
        console.warn('[Code Audit] AI stream failed, using fallback:', aiError);
      }
    } else {
      emit?.({ kind: 'step', message: 'Generating AI code review…' });
      try {
        aiReport = await generateCodeAuditReport(snapshots, versionReleaseAnalysis);
      } catch (e: any) {
        aiError = e.message;
        aiReport = fallbackCodeAuditReport(snapshots);
        console.warn('[Code Audit] AI report failed, using fallback:', aiError);
      }
    }

    emit?.({ kind: 'step', message: 'Saving report…' });

    const report: CodeAuditReport = {
      id: `ca-${Date.now().toString(36)}`,
      generatedAt: new Date().toISOString(),
      trigger,
      products: snapshots,
      aiReport,
      aiError,
      versionReleaseAnalysis: versionReleaseAnalysis.length > 0 ? versionReleaseAnalysis : undefined
    };

    saveCodeAuditReport(report);
    console.log(`[Code Audit] ✅ Report ${report.id} saved (${snapshots.length} products)`);
    emit?.({ kind: 'status', message: `Report ${report.id} saved` });
    return report;
  } finally {
    running = false;
  }
}

export function isCodeAuditRunning(): boolean {
  return running;
}
