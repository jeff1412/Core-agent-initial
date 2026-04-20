import React, { useState, useEffect } from 'react';
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

export default function TaskIntake() {
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, product: data[0].name }));
        }
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    fetch('/api/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(() => {
      alert('Task brief submitted! You can track progress in the Activity Feed.');
      setIsSubmitting(false);
      setFormData(prev => ({ ...prev, description: '', acceptanceCriteria: '' }));
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

  return (
    <div className="task-intake fade-in">
      <div className="card intake-card">
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
            <textarea 
              name="description"
              className="form-textarea" 
              placeholder="Plain language description of what is needed..."
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
            <label className="form-label">Acceptance Criteria <span className="required">*</span></label>
            <textarea 
              name="acceptanceCriteria"
              className="form-textarea" 
              placeholder="How will we know this is done correctly?"
              value={formData.acceptanceCriteria}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid-2" style={{ marginTop: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Do Not Touch</label>
              <input 
                name="doNotTouch"
                type="text" 
                className="form-input" 
                placeholder="Specific files or modules to avoid..."
                value={formData.doNotTouch}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Reference Files</label>
              <input 
                name="referenceFiles"
                type="text" 
                className="form-input" 
                placeholder="Comma-separated paths (e.g. src/utils.js)"
                value={formData.referenceFiles}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: 'var(--space-8)' }}>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? '✦ Submitting...' : '✦ Submit Task to Agent'}
            </button>
            <button type="reset" className="btn btn-secondary" onClick={() => setFormData({
              product: products[0]?.name || '',
              taskType: 'Feature',
              priority: 'Medium',
              description: '',
              acceptanceCriteria: '',
              doNotTouch: '',
              referenceFiles: ''
            })}>Clear Form</button>
          </div>
        </form>
      </div>
    </div>
  );
}
