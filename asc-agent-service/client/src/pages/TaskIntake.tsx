import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './TaskIntake.css';

interface Product {
  name: string;
}

interface FormData {
  product: string;
  taskType: string;
  priority: string;
  description: string;
  acceptanceCriteria: string;
  doNotTouch: string;
  referenceFiles: string;
}

interface TaskRecord {
  id: string;
  postId: string;
  submittedAt: string;
  updatedAt: string;
  status: string;
  product: string;
  taskType: string;
  priority: string;
  description: string;
  submittedBy: string | null;
  prUrl: string | null;
  error: string | null;
}

const STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: 'Pending', badge: 'badge-grey' },
  processing: { label: 'Processing', badge: 'badge-blue' },
  validation_failed: { label: 'Validation Failed', badge: 'badge-yellow' },
  escalated: { label: 'Escalated', badge: 'badge-yellow' },
  pr_created: { label: 'PR Created', badge: 'badge-green' },
  failed: { label: 'Failed', badge: 'badge-red' },
};

export default function TaskIntake() {
  const { apiFetch } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    product: '',
    taskType: 'Feature',
    priority: 'Medium',
    description: '',
    acceptanceCriteria: '',
    doNotTouch: '',
    referenceFiles: ''
  });

  const loadTasks = () => {
    apiFetch('/api/tasks')
      .then(r => r.json())
      .then(data => setTasks(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => {
    apiFetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, product: data[0].name }));
        }
      });
    loadTasks();
    const interval = setInterval(loadTasks, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    apiFetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(() => {
      setIsSubmitting(false);
      setFormData(prev => ({ ...prev, description: '', acceptanceCriteria: '' }));
      loadTasks();
    })
    .catch(err => {
      console.error('Submission failed', err);
      setIsSubmitting(false);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="task-intake fade-in">
      <div className="card intake-card">
        <h3 className="intake-section-title">New Task Brief</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Product <span className="required">*</span></label>
              <select name="product" className="form-select" value={formData.product} onChange={handleChange}>
                {products.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Task Type <span className="required">*</span></label>
              <select name="taskType" className="form-select" value={formData.taskType} onChange={handleChange}>
                <option value="Feature">Feature</option>
                <option value="Bug Fix">Bug Fix</option>
                <option value="Refactor">Refactor</option>
                <option value="Documentation">Documentation</option>
                <option value="Test">Test</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority <span className="required">*</span></label>
              <select name="priority" className="form-select" value={formData.priority} onChange={handleChange}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Description <span className="required">*</span></label>
            <textarea name="description" className="form-textarea"
              placeholder="Plain language description of what is needed..."
              value={formData.description} onChange={handleChange} required />
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Acceptance Criteria <span className="required">*</span></label>
            <textarea name="acceptanceCriteria" className="form-textarea"
              placeholder="How will we know this is done correctly?"
              value={formData.acceptanceCriteria} onChange={handleChange} required />
          </div>

          <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Do Not Touch</label>
              <input name="doNotTouch" type="text" className="form-input"
                placeholder="Specific files or modules to avoid..."
                value={formData.doNotTouch} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Reference Files</label>
              <input name="referenceFiles" type="text" className="form-input"
                placeholder="Comma-separated paths"
                value={formData.referenceFiles} onChange={handleChange} />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 'var(--space-8)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '✦ Submitting...' : '✦ Submit Task to Agent'}
            </button>
          </div>
        </form>
      </div>

      <div className="card intake-history slide-in">
        <div className="intake-history-header">
          <h3 className="intake-section-title">Task History</h3>
          <button className="btn btn-secondary btn-sm" onClick={loadTasks}>Refresh</button>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Type</th>
                <th>Description</th>
                <th>Submitted By</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-5 text-muted">No tasks yet. Submit your first task above.</td></tr>
              ) : tasks.map(task => {
                const st = STATUS_LABELS[task.status] || { label: task.status, badge: 'badge-grey' };
                return (
                  <tr key={task.id}>
                    <td className="mono" style={{ fontSize: '11px' }}>{formatDate(task.submittedAt)}</td>
                    <td><span className="badge badge-grey">{task.product}</span></td>
                    <td>{task.taskType}</td>
                    <td style={{ maxWidth: '240px' }} className="truncate">{task.description}</td>
                    <td className="mono" style={{ fontSize: '11px' }}>{task.submittedBy?.split('@')[0] || '—'}</td>
                    <td><span className={`badge ${st.badge}`}>{st.label}</span></td>
                    <td>
                      {task.prUrl ? (
                        <a href={task.prUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">View PR</a>
                      ) : task.error ? (
                        <span className="text-muted" title={task.error} style={{ fontSize: '11px' }}>Error</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
