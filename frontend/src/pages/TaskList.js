import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { format, parseISO, isToday, isPast } from 'date-fns';

function TaskList() {
  const { api } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);
      params.append('limit', '100');
      const response = await api.get(`/tasks?${params.toString()}`);
      setTasks(response.data.tasks);
    } catch (error) { console.error('Failed to fetch tasks:', error); }
    finally { setLoading(false); }
  }, [api, filters, sortBy, sortOrder]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreateTask = async (taskData) => {
    try { await api.post('/tasks', taskData); fetchTasks(); setShowModal(false); }
    catch (error) { console.error('Failed to create task:', error); }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try { await api.put(`/tasks/${taskId}`, taskData); fetchTasks(); setShowModal(false); setEditingTask(null); }
    catch (error) { console.error('Failed to update task:', error); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try { await api.delete(`/tasks/${taskId}`); fetchTasks(); }
    catch (error) { console.error('Failed to delete task:', error); }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try { await api.patch(`/tasks/${taskId}/status`, { status: newStatus }); fetchTasks(); }
    catch (error) { console.error('Failed to update status:', error); }
  };

  const getPriorityBadgeClass = (p) => ({ Critical: 'critical', High: 'high', Medium: 'medium', Low: 'low' }[p] || 'medium');
  const getStatusSelectStyle = (s) => {
    const colors = { 'Backlog': '#64748b', 'In Process': '#6366f1', 'On Hold': '#f59e0b', 'Complete': '#10b981' };
    return { backgroundColor: `${colors[s]}15`, color: colors[s] };
  };
  const getDueDateClass = (dueDate) => {
    if (!dueDate) return '';
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return 'overdue';
    if (isToday(date)) return 'today';
    return '';
  };

  const SearchIcon = () => <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>;
  const PlusIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4v16m8-8H4"/></svg>;
  const EditIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  const TrashIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
  const MoreIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>;

  return (
    <div className="tasks-page">
      <header className="page-header">
        <div className="page-header-content"><h1>Tasks</h1></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><PlusIcon /> New Task</button>
      </header>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <SearchIcon />
          <input type="text" className="search-input" placeholder="Search tasks..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        </div>
        <select className="filter-select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          <option value="Backlog">Backlog</option>
          <option value="In Process">In Process</option>
          <option value="On Hold">On Hold</option>
          <option value="Complete">Complete</option>
        </select>
        <select className="filter-select" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="filter-select" value={`${sortBy}-${sortOrder}`} onChange={(e) => { const [by, order] = e.target.value.split('-'); setSortBy(by); setSortOrder(order); }}>
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="due_date-asc">Due Date (Earliest)</option>
          <option value="due_date-desc">Due Date (Latest)</option>
          <option value="priority-asc">Priority (High → Low)</option>
        </select>
      </div>

      {loading ? (
        <div style={{display:'flex',justifyContent:'center',padding:'4rem'}}><div className="loading-spinner"></div></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No tasks found</h3>
          <p>Create a new task or adjust your filters</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Task</button>
        </div>
      ) : (
        <div className="tasks-grid">
          {tasks.map((task) => (
            <div key={task.id} className={`task-card ${task.status === 'Complete' ? 'completed' : ''}`}>
              <div className="task-card-header">
                <span className={`priority-badge ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>
                <div className="task-card-actions">
                  <button className="task-action-btn" onClick={() => { setEditingTask(task); setShowModal(true); }} title="Edit"><EditIcon /></button>
                  <button className="task-action-btn" onClick={() => handleDeleteTask(task.id)} title="Delete"><TrashIcon /></button>
                </div>
              </div>
              <h3 className="task-card-title">{task.task_name}</h3>
              {task.details && <p className="task-card-details">{task.details}</p>}
              <div className="task-card-footer">
                <select className="status-select" value={task.status} onChange={(e) => handleStatusChange(task.id, e.target.value)} style={getStatusSelectStyle(task.status)}>
                  <option value="Backlog">Backlog</option>
                  <option value="In Process">In Process</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Complete">Complete</option>
                </select>
                {task.due_date && (
                  <span className={`task-due-date ${getDueDateClass(task.due_date)}`}>
                    {getDueDateClass(task.due_date) === 'overdue' ? 'Overdue · ' : getDueDateClass(task.due_date) === 'today' ? 'Today · ' : ''}
                    {format(parseISO(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TaskModal task={editingTask} onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSave={editingTask ? (data) => handleUpdateTask(editingTask.id, data) : handleCreateTask} />
      )}
    </div>
  );
}

function TaskModal({ task, onClose, onSave }) {
  const [formData, setFormData] = useState({
    task_name: task?.task_name || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Backlog',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
    details: task?.details || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ ...formData, due_date: formData.due_date || null });
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal animate-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Task Name *</label>
              <input type="text" className="form-input" value={formData.task_name} onChange={(e) => setFormData({ ...formData, task_name: e.target.value })} placeholder="What needs to be done?" required maxLength={200} autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Backlog">Backlog</option>
                  <option value="In Process">In Process</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Complete">Complete</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" className="form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Details</label>
              <textarea className="form-textarea" value={formData.details} onChange={(e) => setFormData({ ...formData, details: e.target.value })} placeholder="Add more details about this task..." rows={4} maxLength={5000} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskList;
