import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import './ScheduleSettings.css';

export type ScheduleJob = 'heartbeat' | 'codeAudit';

interface JobScheduleState {
  enabled: boolean;
  daysOfWeek: number[];
  hour: number;
  minute: number;
  label?: string;
  cron?: string | null;
}

interface ScheduleStatus {
  heartbeat: JobScheduleState;
  codeAudit: JobScheduleState;
  dayLabels: string[];
}

interface ScheduleSettingsProps {
  job: ScheduleJob;
  title: string;
  description: string;
}

export default function ScheduleSettings({ job, title, description }: ScheduleSettingsProps) {
  const [status, setStatus] = useState<ScheduleStatus | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1]);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = () => {
    apiFetch('/api/schedules')
      .then(r => r.json())
      .then((data: ScheduleStatus) => {
        setStatus(data);
        const s = data[job];
        setEnabled(s.enabled);
        setDaysOfWeek(s.daysOfWeek);
        setHour(s.hour);
        setMinute(s.minute);
      });
  };

  useEffect(() => { load(); }, [job]);

  const toggleDay = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enabled && daysOfWeek.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one day when schedule is enabled.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await apiFetch(`/api/schedules/${job}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, daysOfWeek, hour, minute })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus(data);
      setMessage({ type: 'success', text: 'Schedule saved. Server cron updated.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const dayLabels = status?.dayLabels || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentLabel = status?.[job]?.label || '';

  return (
    <div className="card schedule-settings slide-in">
      <div className="schedule-settings-header">
        <div>
          <h3>{title}</h3>
          <p className="text-muted schedule-settings-desc">{description}</p>
        </div>
        {currentLabel && (
          <span className={`badge ${enabled ? 'badge-green' : 'badge-grey'}`}>
            {currentLabel}
          </span>
        )}
      </div>

      {message && <div className={`schedule-settings-msg ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSave} className="schedule-settings-form">
        <label className="schedule-toggle">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <span>Enable scheduled runs</span>
        </label>

        <div className="form-group">
          <label className="form-label">Days of week</label>
          <div className="schedule-day-grid">
            {dayLabels.map((label, idx) => (
              <button
                key={idx}
                type="button"
                className={`schedule-day-btn ${daysOfWeek.includes(idx) ? 'active' : ''}`}
                onClick={() => toggleDay(idx)}
                disabled={!enabled}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Hour (24h)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={23}
              value={hour}
              onChange={e => setHour(Number(e.target.value))}
              disabled={!enabled}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Minute</label>
            <input
              type="number"
              className="form-input"
              min={0}
              max={59}
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              disabled={!enabled}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving...' : 'Save Schedule'}
        </button>
      </form>
    </div>
  );
}
