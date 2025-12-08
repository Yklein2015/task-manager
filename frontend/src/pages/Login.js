import React, { useState } from 'react';
import { useAuth } from '../App';

function Login() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    try {
      if (isLogin) { await login(email, password); } 
      else { await register(email, password); }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const CheckIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7"/></svg>;
  const MailIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>;
  const ChartIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>;
  const LogoIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><path d="M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>;

  return (
    <div className="login-page">
      <div className="login-hero">
        <div className="login-hero-brand">
          <div className="login-hero-logo"><LogoIcon /></div>
          <span className="login-hero-title">TaskFlow</span>
        </div>
        <div className="login-hero-content">
          <h1>Organize your work, amplify your productivity</h1>
          <p>A simple, powerful task manager that helps you focus on what matters most.</p>
          <div className="login-features">
            <div className="login-feature"><div className="login-feature-icon"><CheckIcon /></div><span>Intuitive task management</span></div>
            <div className="login-feature"><div className="login-feature-icon"><MailIcon /></div><span>Daily email summaries</span></div>
            <div className="login-feature"><div className="login-feature-icon"><ChartIcon /></div><span>Track your progress</span></div>
          </div>
        </div>
        <p className="login-footer">© 2025 TaskFlow. All rights reserved.</p>
      </div>

      <div className="login-form-container">
        <div className="login-form-wrapper animate-in">
          <div className="mobile-logo">
            <div className="mobile-logo-icon"><LogoIcon /></div>
            <span style={{fontSize: '1.25rem', fontWeight: 600}}>TaskFlow</span>
          </div>
          <div className="login-form-header">
            <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
            <p>{isLogin ? 'Sign in to your account to continue' : 'Start managing your tasks today'}</p>
          </div>
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
              {!isLogin && <span className="form-hint">Min 8 characters, mixed case, numbers</span>}
            </div>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input type="password" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '0.75rem'}} disabled={loading}>
              {loading ? (isLogin ? 'Signing in...' : 'Creating account...') : (isLogin ? 'Sign in' : 'Create account')}
            </button>
          </form>
          <div className="login-form-footer">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
