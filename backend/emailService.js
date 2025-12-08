const { getDb } = require('./db');

// Email service - simulated for development
// Replace with actual email service (SendGrid, Amazon SES, etc.) in production

class EmailService {
  constructor() {
    this.emailQueue = [];
  }

  // Simulate sending email
  async sendEmail(to, subject, htmlContent) {
    console.log('\n========== EMAIL NOTIFICATION ==========');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('Content Preview:');
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('========================================\n');
    
    // In production, replace with actual email sending:
    // await sendgrid.send({ to, from: 'noreply@taskmanager.com', subject, html: htmlContent });
    
    return { success: true, messageId: `sim_${Date.now()}` };
  }

  // Generate daily task summary email
  generateDailySummaryEmail(user, tasks, productivityTip) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Categorize tasks
    const overdueTasks = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'Complete');
    const dueTodayTasks = tasks.filter(t => t.due_date && t.due_date.startsWith(today) && t.status !== 'Complete');
    const upcomingTasks = tasks.filter(t => (!t.due_date || t.due_date > today) && t.status !== 'Complete');

    const priorityColors = {
      'Critical': '#dc2626',
      'High': '#ea580c',
      'Medium': '#ca8a04',
      'Low': '#16a34a'
    };

    const statusColors = {
      'Backlog': '#6b7280',
      'In Process': '#3b82f6',
      'On Hold': '#f59e0b',
      'Complete': '#10b981'
    };

    const renderTask = (task) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 500;">${task.task_name}</td>
        <td style="padding: 12px;">
          <span style="background: ${priorityColors[task.priority]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${task.priority}
          </span>
        </td>
        <td style="padding: 12px;">
          <span style="background: ${statusColors[task.status]}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
            ${task.status}
          </span>
        </td>
        <td style="padding: 12px; color: #6b7280;">${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}</td>
      </tr>
    `;

    const renderSection = (title, taskList, color) => {
      if (taskList.length === 0) return '';
      return `
        <div style="margin-bottom: 24px;">
          <h2 style="color: ${color}; margin-bottom: 12px; font-size: 18px;">
            ${title} (${taskList.length})
          </h2>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">Task</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Priority</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Status</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">Due Date</th>
              </tr>
            </thead>
            <tbody>
              ${taskList.map(renderTask).join('')}
            </tbody>
          </table>
        </div>
      `;
    };

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">📋 Task Manager</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Your Daily Task Summary</p>
      <p style="color: rgba(255,255,255,0.7); margin: 4px 0 0 0; font-size: 14px;">${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>

    <!-- Content -->
    <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 12px 12px;">
      <!-- Summary Stats -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 120px; background: white; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${overdueTasks.length}</div>
          <div style="color: #6b7280; font-size: 14px;">Overdue</div>
        </div>
        <div style="flex: 1; min-width: 120px; background: white; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${dueTodayTasks.length}</div>
          <div style="color: #6b7280; font-size: 14px;">Due Today</div>
        </div>
        <div style="flex: 1; min-width: 120px; background: white; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${upcomingTasks.length}</div>
          <div style="color: #6b7280; font-size: 14px;">Upcoming</div>
        </div>
      </div>

      <!-- Task Sections -->
      ${user.include_overdue ? renderSection('⚠️ Overdue Tasks', overdueTasks, '#dc2626') : ''}
      ${user.include_due_today ? renderSection('📅 Due Today', dueTodayTasks, '#f59e0b') : ''}
      ${user.include_upcoming ? renderSection('🔜 Upcoming Tasks', upcomingTasks.slice(0, 10), '#3b82f6') : ''}

      ${tasks.length === 0 ? `
        <div style="text-align: center; padding: 40px; background: white; border-radius: 8px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h3 style="color: #374151; margin: 0 0 8px 0;">All caught up!</h3>
          <p style="color: #6b7280; margin: 0;">You have no pending tasks. Great job!</p>
        </div>
      ` : ''}

      <!-- Productivity Tip -->
      ${user.include_productivity_tips && productivityTip ? `
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 8px; margin-top: 24px;">
          <h3 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">💡 Productivity Tip of the Day</h3>
          <p style="color: #78350f; margin: 0; font-size: 15px; line-height: 1.5;">${productivityTip}</p>
        </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin-top: 32px;">
        <a href="http://localhost:3000" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          Open Task Manager →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">You're receiving this email because you have email notifications enabled.</p>
      <p style="margin: 0;">Manage your preferences in the Task Manager settings.</p>
    </div>
  </div>
</body>
</html>
    `;

    return {
      subject: `📋 Daily Tasks: ${overdueTasks.length} overdue, ${dueTodayTasks.length} due today`,
      html: htmlContent
    };
  }

  // Get random productivity tip
  getRandomTip() {
    const db = getDb();
    const tip = db.prepare('SELECT tip_text FROM productivity_tips ORDER BY RANDOM() LIMIT 1').get();
    return tip ? tip.tip_text : null;
  }

  // Send daily summary to a user
  async sendDailySummary(user) {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? AND is_deleted = 0 AND status != 'Complete'
      ORDER BY due_date ASC NULLS LAST
    `).all(user.id);

    // Only send if user has tasks
    if (tasks.length === 0 && !user.include_productivity_tips) {
      return null;
    }

    const tip = user.include_productivity_tips ? this.getRandomTip() : null;
    const email = this.generateDailySummaryEmail(user, tasks, tip);
    
    return await this.sendEmail(user.email, email.subject, email.html);
  }

  // Send test email to user
  async sendTestEmail(user) {
    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY due_date ASC NULLS LAST
    `).all(user.id);

    const tip = this.getRandomTip();
    const email = this.generateDailySummaryEmail(user, tasks, tip);
    
    return await this.sendEmail(user.email, `[TEST] ${email.subject}`, email.html);
  }

  // Preview email content (returns HTML without sending)
  previewEmail(user) {
    const db = getDb();
    const tasks = db.prepare(`
      SELECT * FROM tasks 
      WHERE user_id = ? AND is_deleted = 0
      ORDER BY due_date ASC NULLS LAST
    `).all(user.id);

    const tip = this.getRandomTip();
    return this.generateDailySummaryEmail(user, tasks, tip);
  }
}

module.exports = new EmailService();
