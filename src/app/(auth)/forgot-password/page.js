'use client';

import { useState } from 'react';
import Link from 'next/navigation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <div className="auth-header">
          <div className="logo-icon auth-logo" style={{ width: '48px', height: '48px', fontSize: '20px', borderRadius: '8px' }}>AF</div>
          <h1>Reset Password</h1>
          <p className="auth-subtitle">Get recovery instructions for your account</p>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>✉️</div>
            <h2>Check Your Email</h2>
            <p style={{ marginTop: '8px', marginBottom: '24px' }}>
              We have simulated sending password reset instructions to <strong>{email}</strong>.
            </p>
            <a href="/login" className="btn btn-primary w-full">
              Back to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email-input">Work Email Address</label>
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

            <button type="submit" className="btn btn-primary w-full" style={{ marginTop: '16px' }} disabled={loading}>
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px' }}>
              Remember password? <a href="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign In</a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
