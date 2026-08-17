'use strict';

/**
 * modules/scheduleStore.ts — Dashboard-managed cron schedules for automated jobs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '..', 'schedule-config.json');

export type ScheduleJob = 'heartbeat' | 'codeAudit';

export interface JobSchedule {
  enabled: boolean;
  daysOfWeek: number[];
  hour: number;
  minute: number;
}

export interface ScheduleConfig {
  heartbeat: JobSchedule;
  codeAudit: JobSchedule;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_CONFIG: ScheduleConfig = {
  heartbeat: { enabled: true, daysOfWeek: [1], hour: 9, minute: 0 },
  codeAudit: { enabled: true, daysOfWeek: [1, 3, 5], hour: 10, minute: 0 }
};

function clampHour(n: number): number {
  return Math.max(0, Math.min(23, Math.floor(n)));
}

function clampMinute(n: number): number {
  return Math.max(0, Math.min(59, Math.floor(n)));
}

function normalizeJobSchedule(raw: Partial<JobSchedule> | undefined, fallback: JobSchedule): JobSchedule {
  const days = Array.isArray(raw?.daysOfWeek)
    ? [...new Set(raw!.daysOfWeek.filter(d => d >= 0 && d <= 6))].sort()
    : fallback.daysOfWeek;
  return {
    enabled: raw?.enabled ?? fallback.enabled,
    daysOfWeek: days.length > 0 ? days : fallback.daysOfWeek,
    hour: clampHour(raw?.hour ?? fallback.hour),
    minute: clampMinute(raw?.minute ?? fallback.minute)
  };
}

function normalizeConfig(raw: Partial<ScheduleConfig>): ScheduleConfig {
  return {
    heartbeat: normalizeJobSchedule(raw.heartbeat, DEFAULT_CONFIG.heartbeat),
    codeAudit: normalizeJobSchedule(raw.codeAudit, DEFAULT_CONFIG.codeAudit)
  };
}

function readConfig(): ScheduleConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return normalizeConfig(JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')));
    }
  } catch {
    console.warn('[Schedule] Could not read config, using defaults');
  }
  return normalizeConfig({});
}

function writeConfig(config: ScheduleConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getScheduleConfig(): ScheduleConfig {
  return readConfig();
}

export function getJobSchedule(job: ScheduleJob): JobSchedule {
  return readConfig()[job];
}

export function saveJobSchedule(job: ScheduleJob, update: Partial<JobSchedule>): ScheduleConfig {
  const current = readConfig();
  current[job] = normalizeJobSchedule({ ...current[job], ...update }, DEFAULT_CONFIG[job]);
  writeConfig(current);
  return current;
}

/** Convert UI schedule to cron expression (minute hour * * days). */
export function scheduleToCron(schedule: JobSchedule): string | null {
  if (!schedule.enabled || schedule.daysOfWeek.length === 0) return null;
  const days = [...schedule.daysOfWeek].sort((a, b) => a - b).join(',');
  return `${schedule.minute} ${schedule.hour} * * ${days}`;
}

export function describeSchedule(schedule: JobSchedule): string {
  if (!schedule.enabled) return 'Disabled';
  if (schedule.daysOfWeek.length === 0) return 'No days selected';
  const days = schedule.daysOfWeek.map(d => DAY_LABELS[d]).join(', ');
  const hh = String(schedule.hour).padStart(2, '0');
  const mm = String(schedule.minute).padStart(2, '0');
  return `${days} at ${hh}:${mm}`;
}

export function getScheduleStatus() {
  const config = readConfig();
  return {
    heartbeat: {
      ...config.heartbeat,
      cron: scheduleToCron(config.heartbeat),
      label: describeSchedule(config.heartbeat)
    },
    codeAudit: {
      ...config.codeAudit,
      cron: scheduleToCron(config.codeAudit),
      label: describeSchedule(config.codeAudit)
    },
    dayLabels: DAY_LABELS
  };
}
