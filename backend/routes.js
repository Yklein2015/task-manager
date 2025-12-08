const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, query, validationResult } = require('express-validator');
const { getDb } = require('./db');
const { 
  generateTokens, 
  authenticateToken, 
  verifyRefreshToken, 
  invalidateRefreshToken,
  invalidateAllUserSessions 
} = require('./auth');
const emailService = require('./emailService');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ============================================
// AUTH ROUTES
// ============================================

// Register
router.post('/auth/register', [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existingUser = getDb().prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    getDb().prepare(`
      INSERT INTO users (id, email, password_hash)
      VALUES (?, ?, ?)
    `).run(userId, email, passwordHash);

    // Generate tokens
    const tokens = generateTokens(userId);

    // Create some sample tasks for new users
    const sampleTasks = [
      { name: 'Welcome to Task Manager! 👋', priority: 'Medium', status: 'Backlog', details: 'This is your first task. Click to edit or delete it.' },
      { name: 'Set up your preferences', priority: 'Low', status: 'Backlog', details: 'Configure your timezone and email notification preferences in Settings.' },
      { name: 'Create your first real task', priority: 'High', status: 'Backlog', details: 'Click the "New Task" button to add tasks you need to accomplish.' }
    ];

    const insertTask = getDb().prepare(`
      INSERT INTO tasks (id, user_id, task_name, priority, status, details, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sampleTasks.forEach((task, index) => {
      insertTask.run(uuidv4(), userId, task.name, task.priority, task.status, task.details, index);
    });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: userId, email },
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validate, async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    // Find user
    const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = generateTokens(user.id);

    res.json({
      message: 'Login successful',
      user: { 
        id: user.id, 
        email: user.email,
        timezone: user.timezone,
        email_notification_enabled: !!user.email_notification_enabled
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/auth/logout', authenticateToken, (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    invalidateRefreshToken(refreshToken);
  }
  res.json({ message: 'Logged out successfully' });
});

// Refresh token
router.post('/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Invalidate old refresh token
  invalidateRefreshToken(refreshToken);

  // Generate new tokens
  const tokens = generateTokens(decoded.userId);

  res.json(tokens);
});

// Forgot password (simulated)
router.post('/auth/forgot-password', [
  body('email').isEmail().normalizeEmail()
], validate, async (req, res) => {
  const { email } = req.body;
  
  const user = getDb().prepare('SELECT id FROM users WHERE email = ?').get(email);
  
  // Always return success to prevent email enumeration
  if (user) {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
    
    getDb().prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), user.id, token, expiresAt);
    
    // In production, send email with reset link
    console.log(`Password reset token for ${email}: ${token}`);
  }
  
  res.json({ message: 'If an account exists with this email, a reset link will be sent.' });
});

// Reset password
router.post('/auth/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
], validate, async (req, res) => {
  const { token, password } = req.body;
  
  const resetToken = getDb().prepare(`
    SELECT * FROM password_reset_tokens 
    WHERE token = ? AND expires_at > datetime('now') AND used = 0
  `).get(token);
  
  if (!resetToken) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Update password
  getDb().prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(passwordHash, resetToken.user_id);
  
  // Mark token as used
  getDb().prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?')
    .run(resetToken.id);
  
  // Invalidate all sessions
  invalidateAllUserSessions(resetToken.user_id);
  
  res.json({ message: 'Password reset successful' });
});

// ============================================
// USER ROUTES
// ============================================

// Get current user
router.get('/users/me', authenticateToken, (req, res) => {
  const user = getDb().prepare(`
    SELECT id, email, timezone, email_notification_enabled, email_notification_time,
           include_overdue, include_due_today, include_upcoming, include_productivity_tips,
           reminder_24h_enabled, overdue_notification_enabled, created_at
    FROM users WHERE id = ?
  `).get(req.user.id);
  
  res.json(user);
});

// Update user profile
router.put('/users/me', authenticateToken, [
  body('email').optional().isEmail().normalizeEmail(),
  body('timezone').optional().isString()
], validate, (req, res) => {
  const { email, timezone } = req.body;
  const updates = [];
  const params = [];
  
  if (email) {
    // Check if email is taken
    const existing = getDb().prepare('SELECT id FROM users WHERE email = ? AND id != ?')
      .get(email, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    updates.push('email = ?');
    params.push(email);
  }
  
  if (timezone) {
    updates.push('timezone = ?');
    params.push(timezone);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user.id);
  
  getDb().prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const user = getDb().prepare('SELECT id, email, timezone FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Change password
router.put('/users/me/password', authenticateToken, [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/[a-z]/)
    .matches(/[A-Z]/)
    .matches(/[0-9]/)
], validate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const user = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!validPassword) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  
  const passwordHash = await bcrypt.hash(newPassword, 10);
  getDb().prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(passwordHash, req.user.id);
  
  res.json({ message: 'Password changed successfully' });
});

// Get user preferences
router.get('/users/me/preferences', authenticateToken, (req, res) => {
  const prefs = getDb().prepare(`
    SELECT timezone, email_notification_enabled, email_notification_time,
           include_overdue, include_due_today, include_upcoming, include_productivity_tips,
           reminder_24h_enabled, overdue_notification_enabled
    FROM users WHERE id = ?
  `).get(req.user.id);
  
  res.json(prefs);
});

// Update user preferences
router.put('/users/me/preferences', authenticateToken, (req, res) => {
  const allowedFields = [
    'timezone', 'email_notification_enabled', 'email_notification_time',
    'include_overdue', 'include_due_today', 'include_upcoming', 'include_productivity_tips',
    'reminder_24h_enabled', 'overdue_notification_enabled'
  ];
  
  const updates = [];
  const params = [];
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid updates provided' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.user.id);
  
  getDb().prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const prefs = getDb().prepare(`
    SELECT timezone, email_notification_enabled, email_notification_time,
           include_overdue, include_due_today, include_upcoming, include_productivity_tips,
           reminder_24h_enabled, overdue_notification_enabled
    FROM users WHERE id = ?
  `).get(req.user.id);
  
  res.json(prefs);
});

// ============================================
// TASK ROUTES
// ============================================

// List tasks with filters
router.get('/tasks', authenticateToken, (req, res) => {
  const { 
    status, priority, due_from, due_to, created_from, created_to,
    search, sort_by = 'created_at', sort_order = 'desc',
    page = 1, limit = 50, include_deleted = false
  } = req.query;
  
  let whereClause = 'WHERE user_id = ?';
  const params = [req.user.id];
  
  if (!include_deleted || include_deleted === 'false') {
    whereClause += ' AND is_deleted = 0';
  }
  
  if (status) {
    const statuses = status.split(',');
    whereClause += ` AND status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  
  if (priority) {
    const priorities = priority.split(',');
    whereClause += ` AND priority IN (${priorities.map(() => '?').join(',')})`;
    params.push(...priorities);
  }
  
  if (due_from) {
    whereClause += ' AND due_date >= ?';
    params.push(due_from);
  }
  
  if (due_to) {
    whereClause += ' AND due_date <= ?';
    params.push(due_to);
  }
  
  if (created_from) {
    whereClause += ' AND created_at >= ?';
    params.push(created_from);
  }
  
  if (created_to) {
    whereClause += ' AND created_at <= ?';
    params.push(created_to);
  }
  
  if (search) {
    whereClause += ' AND (task_name LIKE ? OR details LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  // Validate sort_by
  const validSortFields = ['due_date', 'priority', 'created_at', 'task_name', 'sort_order', 'status'];
  const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  // Handle priority sorting (convert to numeric order)
  let orderClause = '';
  if (sortField === 'priority') {
    orderClause = `ORDER BY CASE priority 
      WHEN 'Critical' THEN 1 
      WHEN 'High' THEN 2 
      WHEN 'Medium' THEN 3 
      WHEN 'Low' THEN 4 
      END ${sortDir}`;
  } else if (sortField === 'due_date') {
    orderClause = `ORDER BY due_date IS NULL, due_date ${sortDir}`;
  } else {
    orderClause = `ORDER BY ${sortField} ${sortDir}`;
  }
  
  // Get total count
  const countResult = getDb().prepare(`SELECT COUNT(*) as total FROM tasks ${whereClause}`).get(...params);
  
  // Get paginated results
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const tasks = getDb().prepare(`
    SELECT * FROM tasks ${whereClause} ${orderClause} LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  
  res.json({
    tasks,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: countResult.total,
      pages: Math.ceil(countResult.total / parseInt(limit))
    }
  });
});

// Create task
router.post('/tasks', authenticateToken, [
  body('task_name').notEmpty().isLength({ max: 200 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('status').optional().isIn(['Backlog', 'In Process', 'On Hold', 'Complete']),
  body('details').optional().isLength({ max: 5000 })
], validate, (req, res) => {
  const { task_name, priority = 'Medium', due_date, status = 'Backlog', details } = req.body;
  
  const taskId = uuidv4();
  
  // Get max sort_order for user
  const maxOrder = getDb().prepare('SELECT MAX(sort_order) as max FROM tasks WHERE user_id = ?')
    .get(req.user.id);
  const sortOrder = (maxOrder.max || 0) + 1;
  
  getDb().prepare(`
    INSERT INTO tasks (id, user_id, task_name, priority, due_date, status, details, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(taskId, req.user.id, task_name, priority, due_date || null, status, details || null, sortOrder);
  
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.status(201).json(task);
});

// Get single task
router.get('/tasks/:id', authenticateToken, (req, res) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

// Update task
router.put('/tasks/:id', authenticateToken, [
  body('task_name').optional().notEmpty().isLength({ max: 200 }),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('status').optional().isIn(['Backlog', 'In Process', 'On Hold', 'Complete']),
  body('details').optional().isLength({ max: 5000 })
], validate, (req, res) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  const allowedFields = ['task_name', 'priority', 'due_date', 'status', 'details', 'sort_order'];
  const updates = [];
  const params = [];
  
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field]);
    }
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(req.params.id);
  
  getDb().prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  
  const updatedTask = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updatedTask);
});

// Update task status only
router.patch('/tasks/:id/status', authenticateToken, [
  body('status').isIn(['Backlog', 'In Process', 'On Hold', 'Complete'])
], validate, (req, res) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  getDb().prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(req.body.status, req.params.id);
  
  const updatedTask = getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(updatedTask);
});

// Delete task (soft delete)
router.delete('/tasks/:id', authenticateToken, (req, res) => {
  const task = getDb().prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  getDb().prepare(`
    UPDATE tasks 
    SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(req.params.id);
  
  res.json({ message: 'Task deleted successfully' });
});

// Get task statistics
router.get('/tasks/stats/summary', authenticateToken, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const stats = getDb().prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status != 'Complete' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status = 'Complete' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN due_date < ? AND status != 'Complete' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN date(due_date) = ? AND status != 'Complete' THEN 1 ELSE 0 END) as due_today,
      SUM(CASE WHEN status = 'Backlog' THEN 1 ELSE 0 END) as backlog,
      SUM(CASE WHEN status = 'In Process' THEN 1 ELSE 0 END) as in_process,
      SUM(CASE WHEN status = 'On Hold' THEN 1 ELSE 0 END) as on_hold,
      SUM(CASE WHEN priority = 'Critical' AND status != 'Complete' THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN priority = 'High' AND status != 'Complete' THEN 1 ELSE 0 END) as high,
      SUM(CASE WHEN priority = 'Medium' AND status != 'Complete' THEN 1 ELSE 0 END) as medium,
      SUM(CASE WHEN priority = 'Low' AND status != 'Complete' THEN 1 ELSE 0 END) as low
    FROM tasks 
    WHERE user_id = ? AND is_deleted = 0
  `).get(today, today, req.user.id);
  
  res.json(stats);
});

// Reorder tasks
router.post('/tasks/reorder', authenticateToken, [
  body('taskIds').isArray()
], validate, (req, res) => {
  const { taskIds } = req.body;
  
  const updateStmt = getDb().prepare('UPDATE tasks SET sort_order = ? WHERE id = ? AND user_id = ?');
  
  const transaction = db.transaction(() => {
    taskIds.forEach((taskId, index) => {
      updateStmt.run(index, taskId, req.user.id);
    });
  });
  
  transaction();
  
  res.json({ message: 'Tasks reordered successfully' });
});

// Export tasks
router.get('/tasks/export/data', authenticateToken, (req, res) => {
  const { format = 'json' } = req.query;
  
  // Apply same filters as list endpoint
  const { status, priority } = req.query;
  let whereClause = 'WHERE user_id = ? AND is_deleted = 0';
  const params = [req.user.id];
  
  if (status) {
    const statuses = status.split(',');
    whereClause += ` AND status IN (${statuses.map(() => '?').join(',')})`;
    params.push(...statuses);
  }
  
  if (priority) {
    const priorities = priority.split(',');
    whereClause += ` AND priority IN (${priorities.map(() => '?').join(',')})`;
    params.push(...priorities);
  }
  
  const tasks = getDb().prepare(`
    SELECT task_name, priority, date_created, due_date, status, details, created_at, updated_at
    FROM tasks ${whereClause}
    ORDER BY created_at DESC
  `).all(...params);
  
  if (format === 'csv') {
    const headers = ['task_name', 'priority', 'date_created', 'due_date', 'status', 'details'];
    const csv = [
      headers.join(','),
      ...tasks.map(t => headers.map(h => `"${(t[h] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
    return res.send(csv);
  }
  
  res.json(tasks);
});

// Import tasks
router.post('/tasks/import', authenticateToken, (req, res) => {
  const { tasks } = req.body;
  
  if (!Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Tasks must be an array' });
  }
  
  const errors = [];
  const imported = [];
  
  const insertStmt = getDb().prepare(`
    INSERT INTO tasks (id, user_id, task_name, priority, due_date, status, details, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const maxOrder = getDb().prepare('SELECT MAX(sort_order) as max FROM tasks WHERE user_id = ?')
    .get(req.user.id);
  let sortOrder = (maxOrder.max || 0) + 1;
  
  tasks.forEach((task, index) => {
    try {
      if (!task.task_name || task.task_name.length > 200) {
        errors.push({ line: index + 1, error: 'Invalid or missing task_name' });
        return;
      }
      
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      const validStatuses = ['Backlog', 'In Process', 'On Hold', 'Complete'];
      
      const priority = validPriorities.includes(task.priority) ? task.priority : 'Medium';
      const status = validStatuses.includes(task.status) ? task.status : 'Backlog';
      
      const taskId = uuidv4();
      insertStmt.run(
        taskId,
        req.user.id,
        task.task_name,
        priority,
        task.due_date || null,
        status,
        task.details || null,
        sortOrder++
      );
      
      imported.push(taskId);
    } catch (error) {
      errors.push({ line: index + 1, error: error.message });
    }
  });
  
  res.json({
    imported: imported.length,
    errors: errors.length > 0 ? errors : undefined
  });
});

// ============================================
// EMAIL ROUTES
// ============================================

// Send test email
router.post('/email/test', authenticateToken, async (req, res) => {
  try {
    const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const result = await emailService.sendTestEmail(user);
    res.json({ message: 'Test email sent', ...result });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// Preview email content
router.get('/email/preview', authenticateToken, (req, res) => {
  const user = getDb().prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const preview = emailService.previewEmail(user);
  res.json(preview);
});

module.exports = router;
