'use strict';

/**
 * modules/heartbeatRunner.ts — Orchestrates repo checks, AI report, and persistence
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkAllProductRepos } from './repoHeartbeat';
import { generateHeartbeatReport, fallbackReport } from './heartbeatReporter';
import { saveReport, HeartbeatReport } from './heartbeatStore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let running = false;

function loadProducts(): Array<{ id: string; name: string; owner?: string; repo: string }> {
  const productsPath = path.join(__dirname, '..', 'products.json');
  return JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
}

export async function runHeartbeat(trigger: 'manual' | 'scheduled' = 'manual'): Promise<HeartbeatReport> {
  if (running) {
    throw new Error('A heartbeat report is already in progress. Please wait.');
  }

  running = true;
  console.log(`\n[Heartbeat] Starting ${trigger} repo health check...`);

  try {
    const products = loadProducts();
    const snapshots = await checkAllProductRepos(products);

    let aiReport: string | null = null;
    let aiError: string | null = null;

    try {
      aiReport = await generateHeartbeatReport(snapshots);
    } catch (e: any) {
      aiError = e.message;
      aiReport = fallbackReport(snapshots);
      console.warn('[Heartbeat] AI report failed, using fallback:', aiError);
    }

    const report: HeartbeatReport = {
      id: `hb-${Date.now().toString(36)}`,
      generatedAt: new Date().toISOString(),
      trigger,
      products: snapshots,
      aiReport,
      aiError
    };

    saveReport(report);
    console.log(`[Heartbeat] ✅ Report ${report.id} saved (${snapshots.length} products)`);
    return report;
  } finally {
    running = false;
  }
}

export function isHeartbeatRunning(): boolean {
  return running;
}
