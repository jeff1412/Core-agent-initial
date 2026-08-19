import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        setTokenValid(!!data.valid);
        if (data.email) setMaskedEmail(data.email);
        if (!data.valid) setError(data.error || 'Invalid reset link');
      })
      .catch(() => setError('Could not validate reset link'))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setSuccess(data.message || 'Password updated successfully.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card slide-in">
        <div className="login-brand">
          <div className="brand-icon">A</div>
          <h1>Reset Password</h1>
          <p className="text-muted">Choose a new password for your account</p>
        </div>

        {validating && <p className="text-muted login-hint">Validating reset link...</p>}

        {!validating && !tokenValid && (
          <>
            {error && <div className="login-error">{error}</div>}
            <p className="login-hint">Request a new reset link from the sign-in page.</p>
            <Link to="/login" className="btn btn-primary login-btn">Back to Sign In</Link>
          </>
        )}

        {!validating && tokenValid && (
          <>
            {maskedEmail && <p className="login-hint">Resetting password for <strong>{maskedEmail}</strong></p>}
            {error && <div className="login-error">{error}</div>}
            {success && <div className="login-success">{success}</div>}

            {!success && (
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    minLength={6}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            )}

            <Link to="/login" className="login-forgot-link">Back to Sign In</Link>
          </>
        )}
      </div>
    </div>
  );
}
