'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="logo-icon auth-logo" style={{ width: '48px', height: '48px', fontSize: '20px', borderRadius: '8px' }}>AF</div>
          <h1>AssetFlow</h1>
          <p className="auth-subtitle">Enterprise Asset & Resource Management</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-light)',
            color: 'var(--danger-text)',
            padding: '12px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500,
            border: '1px solid var(--danger-text)'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              type="email"
              className="form-control"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between align-center">
              <label className="form-label" htmlFor="password-input">Password</label>
              <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                Forgot?
              </Link>
            </div>
            <input
              id="password-input"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '16px' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
          New Employee? <Link href="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Account</Link>
        </div>

        {/* Mock Credentials Sandbox Tip */}
        <div style={{
          marginTop: '32px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>🔑 Demo Credentials:</div>
          <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: '6px', color: 'var(--text-secondary)' }}>
            <li>👨‍💻 <strong>Admin:</strong> admin@assetflow.com / admin123</li>
            <li>💼 <strong>Manager:</strong> manager@assetflow.com / manager123</li>
            <li>👔 <strong>Dept Head:</strong> head@assetflow.com / head123</li>
            <li>👤 <strong>Employee:</strong> employee@assetflow.com / employee123</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
