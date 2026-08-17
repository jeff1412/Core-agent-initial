'use strict';

/**
 * modules/scheduleManager.ts — Register and refresh cron jobs from dashboard config
 */

import cron, { ScheduledTask } from 'node-cron';
import { getJobSchedule, scheduleToCron, ScheduleJob } from './scheduleStore';
import { runHeartbeat } from './heartbeatRunner';
import { runCodeAudit } from './codeAuditRunner';

const tasks: Partial<Record<ScheduleJob, ScheduledTask>> = {};

function jobRunner(job: ScheduleJob): () => void {
  if (job === 'heartbeat') {
    return () => {
      runHeartbeat('scheduled').catch(err =>
        console.error('[Schedule] Heartbeat failed:', err.message)
      );
    };
  }
  return () => {
    runCodeAudit('scheduled').catch(err =>
      console.error('[Schedule] Code audit failed:', err.message)
    );
  };
}

export function refreshSchedule(job: ScheduleJob): string | null {
  tasks[job]?.stop();
  delete tasks[job];

  const config = getJobSchedule(job);
  const expr = scheduleToCron(config);
  if (!expr) {
    console.log(`[Schedule] ${job}: disabled`);
    return null;
  }
  if (!cron.validate(expr)) {
    console.warn(`[Schedule] ${job}: invalid cron "${expr}"`);
    return null;
  }

  tasks[job] = cron.schedule(expr, jobRunner(job));
  console.log(`[Schedule] ${job}: ${expr}`);
  return expr;
}

export function initAllSchedules(): void {
  refreshSchedule('heartbeat');
  refreshSchedule('codeAudit');
}

export function refreshAllSchedules(): void {
  initAllSchedules();
}
