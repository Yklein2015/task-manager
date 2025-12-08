import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';

function Settings() {
  const { api, user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { fetchPreferences(); }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/users/me/preferences');
      setPreferences(response.data);
    } catch (error) { console.error('Failed to fetch preferences:', error); }
    finally { setLoading(false); }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/users/me/preferences', preferences);
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) { setMessage({ type: 'error', text: 'Failed to save preferences' }); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.put('/users/me/password', { currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) { setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to change password' }); }
    finally { setSaving(false); }
  };

  const sendTestEmail = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await api.post('/email/test');
      setMessage({ type: 'success', text: 'Test email sent! Check your console/inbox.' });
    } catch (error) { setMessage({ type: 'error', text: 'Failed to send test email' }); }
    finally { setSaving(false); }
  };

  const handleExport = async (format) => {
    try {
      const response = await api.get(`/tasks/export/data?format=${format}`);
      const blob = format === 'csv' 
        ? new Blob([response.data], { type: 'text/csv' })
        : new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tasks.${format}`;
      a.click();
      setMessage({ type: 'success', text: `Tasks exported as ${format.toUpperCase()}!` });
    } catch (error) { setMessage({ type: 'error', text: 'Failed to export tasks' }); }
  };

  if (loading) return <div className="settings-page" style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="loading-spinner"></div></div>;

  return (
    <div className="tasks-page">
      <header className="page-header"><div className="page-header-content"><h1>Settings</h1></div></header>
      <div className="settings-page">
        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

        <div className="settings-section">
          <h2 className="settings-section-title">Account</h2>
          <div className="settings-item">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={user?.email || ''} disabled style={{backgroundColor: 'rgb(241 245 249)'}} />
          </div>
          <div className="settings-item" style={{marginTop: '1rem'}}>
            <label className="form-label">Timezone</label>
            <select className="form-select" value={preferences?.timezone || 'UTC'} onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}>
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Email Notifications</h2>
          <div className="settings-item">
            <div className="settings-item-row">
              <div><p className="settings-item-label">Daily Email Summary</p><p className="settings-item-description">Receive a daily email with your tasks</p></div>
              <label className="toggle-switch">
                <input type="checkbox" checked={preferences?.email_notification_enabled} onChange={(e) => setPreferences({ ...preferences, email_notification_enabled: e.target.checked ? 1 : 0 })} />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          {preferences?.email_notification_enabled === 1 && (
            <>
              <div className="settings-item">
                <div className="settings-item-row">
                  <div><p className="settings-item-label">Include Productivity Tips</p><p className="settings-item-description">Add a daily productivity tip to your email</p></div>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={preferences?.include_productivity_tips} onChange={(e) => setPreferences({ ...preferences, include_productivity_tips: e.target.checked ? 1 : 0 })} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
              <div className="settings-item" style={{marginTop: '0.5rem'}}>
                <label className="form-label">Delivery Time</label>
                <select className="form-select" value={preferences?.email_notification_time || 8} onChange={(e) => setPreferences({ ...preferences, email_notification_time: parseInt(e.target.value) })}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button className="btn btn-secondary" style={{marginTop: '1rem'}} onClick={sendTestEmail} disabled={saving}>Send Test Email</button>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div className="settings-item"><label className="form-label">Current Password</label><input type="password" className="form-input" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} required /></div>
            <div className="settings-item" style={{marginTop: '1rem'}}><label className="form-label">New Password</label><input type="password" className="form-input" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} required minLength={8} /></div>
            <div className="settings-item" style={{marginTop: '1rem'}}><label className="form-label">Confirm New Password</label><input type="password" className="form-input" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} required /></div>
            <button type="submit" className="btn btn-secondary" style={{marginTop: '1rem'}} disabled={saving}>Change Password</button>
          </form>
        </div>

        <div className="settings-section">
          <h2 className="settings-section-title">Export Data</h2>
          <p className="settings-item-description">Download all your tasks</p>
          <div className="export-buttons">
            <button className="btn btn-secondary" onClick={() => handleExport('json')}>Export JSON</button>
            <button className="btn btn-secondary" onClick={() => handleExport('csv')}>Export CSV</button>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={savePreferences} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
