import { useState, useEffect } from 'react';

interface PullRequest {
  id: number | string;
  product: string;
  summary: string;
  branch: string;
  status: string;
  date: string;
  url: string;
}

export default function PullRequests() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/pull-requests')
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

  if (loading) return <div className="p-5 text-muted">Retrieving agent pull request history...</div>;

  return (
    <div className="pull-requests fade-in">
      <div className="table-wrapper slide-in">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Summary</th>
              <th>Branch</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {prs.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center p-5 text-muted">No pull requests found. Agent is waiting for tasks.</td>
              </tr>
            ) : (
              prs.map((pr) => (
                <tr key={pr.id}>
                  <td className="mono">#{pr.id}</td>
                  <td><span className="badge badge-grey">{pr.product}</span></td>
                  <td>{pr.summary}</td>
                  <td className="mono text-secondary" style={{ fontSize: '11px' }}>{pr.branch}</td>
                  <td>
                    <span className={`badge ${
                      pr.status === 'Open' ? 'badge-blue' : 
                      pr.status === 'Merged' ? 'badge-green' : 'badge-grey'
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
