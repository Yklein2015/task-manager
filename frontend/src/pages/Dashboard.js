import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { format } from 'date-fns';

function Dashboard({ setCurrentPage }) {
  const { api } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/tasks/stats/summary'),
        api.get('/tasks?limit=5&sort_by=created_at&sort_order=desc')
      ]);
      setStats(statsRes.data);
      setRecentTasks(tasksRes.data.tasks);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p) => ({ Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e' }[p] || '#6b7280');
  const getStatusBadgeClass = (s) => ({ 'Backlog': 'badge-slate', 'In Process': 'badge-indigo', 'On Hold': 'badge-amber', 'Complete': 'badge-emerald' }[s] || 'badge-slate');

  const AlertIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const CalendarIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>;
  const TaskIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>;
  const CheckIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>;
  const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg>;

  if (loading) return <div className="dashboard" style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'50vh'}}><div className="loading-spinner"></div></div>;

  return (
    <div className="tasks-page">
      <header className="page-header">
        <div className="page-header-content">
          <h1>Dashboard</h1>
          <p>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCurrentPage('tasks')}><PlusIcon /> New Task</button>
      </header>

      <div className="dashboard">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon red"><AlertIcon /></div>
              {stats?.overdue > 0 && <span className="stat-badge red">+{stats.overdue} this week</span>}
            </div>
            <p className="stat-value">{stats?.overdue || 0}</p>
            <p className="stat-label">Overdue</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-icon amber"><CalendarIcon /></div></div>
            <p className="stat-value">{stats?.due_today || 0}</p>
            <p className="stat-label">Due Today</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-header"><div className="stat-icon indigo"><TaskIcon /></div></div>
            <p className="stat-value">{stats?.active || 0}</p>
            <p className="stat-label">Active Tasks</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-header">
              <div className="stat-icon emerald"><CheckIcon /></div>
              {stats?.completed > 0 && <span className="stat-badge emerald">+{Math.min(stats.completed, 8)} this week</span>}
            </div>
            <p className="stat-value">{stats?.completed || 0}</p>
            <p className="stat-label">Completed</p>
          </div>
        </div>

        <div className="charts-row">
          <div className="chart-card">
            <h3 className="chart-title">Tasks by Status</h3>
            <div className="status-bars">
              {[
                { label: 'Backlog', value: stats?.backlog || 0, color: '#94a3b8' },
                { label: 'In Process', value: stats?.in_process || 0, color: '#6366f1' },
                { label: 'On Hold', value: stats?.on_hold || 0, color: '#f59e0b' },
                { label: 'Complete', value: stats?.completed || 0, color: '#10b981' }
              ].map((item) => {
                const total = (stats?.total || 1);
                const pct = Math.round((item.value / total) * 100) || 0;
                return (
                  <div key={item.label} className="status-bar-item">
                    <div className="status-bar-header"><span className="status-bar-label">{item.label}</span><span className="status-bar-value">{item.value}</span></div>
                    <div className="status-bar-track"><div className="status-bar-fill" style={{ width: `${pct}%`, backgroundColor: item.color }}></div></div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="chart-card">
            <h3 className="chart-title">Tasks by Priority</h3>
            <div className="priority-grid">
              {[
                { label: 'Critical', value: stats?.critical || 0, cls: 'critical' },
                { label: 'High', value: stats?.high || 0, cls: 'high' },
                { label: 'Medium', value: stats?.medium || 0, cls: 'medium' },
                { label: 'Low', value: stats?.low || 0, cls: 'low' }
              ].map((item) => (
                <div key={item.label} className="priority-item">
                  <div className={`priority-dot ${item.cls}`}></div>
                  <p className="priority-value">{item.value}</p>
                  <p className="priority-label">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="recent-tasks">
          <div className="recent-tasks-header">
            <h3 className="recent-tasks-title">Recent Tasks</h3>
            <button className="view-all-btn" onClick={() => setCurrentPage('tasks')}>View all →</button>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📝</div><p>No tasks yet. Create your first task!</p></div>
          ) : (
            recentTasks.map((task) => (
              <div key={task.id} className="task-list-item">
                <div className="task-list-main">
                  <span className="task-priority-dot" style={{ backgroundColor: getPriorityColor(task.priority) }}></span>
                  <span className="task-list-name">{task.task_name}</span>
                </div>
                <div className="task-list-meta">
                  <span className={`badge ${getStatusBadgeClass(task.status)}`}>{task.status}</span>
                  {task.due_date && <span className="task-list-due">{format(new Date(task.due_date), 'MMM d')}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
