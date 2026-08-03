import { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface PullRequest {
  id: number | string;
  type: string;
  product: string;
  summary: string;
  actor: string;
  branch: string;
  status: string;
  date: string;
  url: string;
}

export default function PullRequests() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiFetch('/api/pull-requests')
      .then(r => r.json())
      .then(data => {
        setPrs(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch PRs', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-5 text-muted">Retrieving GitHub push and pull activity...</div>;

  return (
    <div className="pull-requests fade-in">
      <div className="page-header-actions" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 className="page-title">Pushes & Pull Requests</h2>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: 'var(--space-1)' }}>
            Real-time audit log of all direct pushes (commits) and pull requests across your connected repositories.
          </p>
        </div>
      </div>

      <div className="table-wrapper slide-in">
        <table className="table">
          <thead>
            <tr>
              <th>ID / Commit</th>
              <th>Type</th>
              <th>Product</th>
              <th>Summary</th>
              <th>Author</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prs.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center p-5 text-muted">No GitHub activity found. Connect repositories and push code to see it live here.</td>
              </tr>
            ) : (
              prs.map((pr) => (
                <tr key={`${pr.type}-${pr.id}`}>
                  <td className="mono" style={{ fontSize: '12px' }}>
                    {pr.type === 'Push' ? pr.id : `#${pr.id.toString().replace('PR #', '')}`}
                  </td>
                  <td>
                    <span className={`badge ${
                      pr.type === 'Push' ? 'badge-green' : 'badge-blue'
                    }`}>
                      {pr.type}
                    </span>
                  </td>
                  <td><span className="badge badge-grey">{pr.product}</span></td>
                  <td style={{ fontWeight: '500' }}>{pr.summary}</td>
                  <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    @{pr.actor}
                  </td>
                  <td className="mono text-secondary" style={{ fontSize: '11px' }}>{pr.branch}</td>
                  <td>
                    <span className={`badge ${
                      pr.status === 'Open' ? 'badge-blue' : 
                      pr.status === 'Merged' ? 'badge-green' : 
                      pr.status === 'Pushed' ? 'badge-purple' : 'badge-grey'
                    }`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="text-secondary">{pr.date}</td>
                  <td>
                    <a 
                      href={pr.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-secondary btn-sm"
                    >
                      View on GitHub
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

