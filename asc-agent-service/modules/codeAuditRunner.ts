'use strict';

/**
 * modules/codeAuditRunner.ts — Orchestrates code file scan, AI review, and persistence
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanAllProductCode } from './codeAuditScanner';
import { generateCodeAuditReport, fallbackCodeAuditReport } from './codeAuditReporter';
import { saveCodeAuditReport, CodeAuditReport } from './codeAuditStore';
import { OnboardedProduct } from './productVersionService';
import { buildProductVersionReleaseAnalysis } from './auditVersionAnalysis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let running = false;

function loadProducts(): OnboardedProduct[] {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'products.json'), 'utf-8'));
}

export async function runCodeAudit(trigger: 'manual' | 'scheduled' = 'manual'): Promise<CodeAuditReport> {
  if (running) {
    throw new Error('A code audit is already in progress. Please wait.');
  }

  running = true;
  console.log(`\n[Code Audit] Starting ${trigger} code review...`);

  try {
    const products = loadProducts();
    const snapshots = await scanAllProductCode(products);
    const versionReleaseAnalysis = await buildProductVersionReleaseAnalysis(products, 2);

    let aiReport: string | null = null;
    let aiError: string | null = null;

    const scannable = snapshots.filter(s => s.filesScanned > 0);
    if (scannable.length === 0) {
      aiReport = fallbackCodeAuditReport(snapshots);
      aiError = 'No source files could be scanned';
    } else {
      try {
        aiReport = await generateCodeAuditReport(snapshots, versionReleaseAnalysis);
      } catch (e: any) {
        aiError = e.message;
        aiReport = fallbackCodeAuditReport(snapshots);
        console.warn('[Code Audit] AI report failed, using fallback:', aiError);
      }
    }

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
    return report;
  } finally {
    running = false;
  }
}

export function isCodeAuditRunning(): boolean {
  return running;
}
