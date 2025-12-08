const cron = require('node-cron');
const { getDb } = require('./db');
const emailService = require('./emailService');

class Scheduler {
  constructor() {
    this.jobs = [];
  }

  start() {
    console.log('Starting scheduler...');

    // Run every hour to check for users who need their daily email
    // This allows for user-specific delivery times based on timezone
    const emailJob = cron.schedule('0 * * * *', async () => {
      console.log('Running hourly email check...');
      await this.sendScheduledEmails();
    });
    this.jobs.push(emailJob);

    // Clean up old deleted tasks (soft delete -> permanent delete after 30 days)
    // Run daily at 3 AM
    const cleanupJob = cron.schedule('0 3 * * *', async () => {
      console.log('Running cleanup job...');
      await this.cleanupDeletedTasks();
    });
    this.jobs.push(cleanupJob);

    // Clean up expired sessions
    const sessionCleanupJob = cron.schedule('0 4 * * *', async () => {
      console.log('Cleaning up expired sessions...');
      await this.cleanupExpiredSessions();
    });
    this.jobs.push(sessionCleanupJob);

    console.log('Scheduler started with jobs:', this.jobs.length);
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    console.log('Scheduler stopped');
  }

  async sendScheduledEmails() {
    const currentHour = new Date().getUTCHours();
    const db = getDb();
    
    // Find users who should receive emails at this hour
    // This is a simplified version - in production, you'd handle timezones properly
    const users = db.prepare(`
      SELECT * FROM users 
      WHERE email_notification_enabled = 1 
      AND email_notification_time = ?
    `).all(currentHour);

    console.log(`Found ${users.length} users scheduled for emails at hour ${currentHour}`);

    for (const user of users) {
      try {
        await emailService.sendDailySummary(user);
        console.log(`Sent daily summary to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        // In production, implement retry logic here
      }
    }
  }

  async cleanupDeletedTasks() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const db = getDb();
    
    const result = db.prepare(`
      DELETE FROM tasks 
      WHERE is_deleted = 1 
      AND deleted_at < ?
    `).run(thirtyDaysAgo);
    db.save();

    console.log(`Permanently deleted ${result.changes} tasks older than 30 days`);
  }

  async cleanupExpiredSessions() {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM sessions 
      WHERE expires_at < datetime('now')
    `).run();
    db.save();

    console.log(`Cleaned up ${result.changes} expired sessions`);
  }

  // Manual trigger for testing
  async triggerDailyEmails() {
    const db = getDb();
    const users = db.prepare(`
      SELECT * FROM users 
      WHERE email_notification_enabled = 1
    `).all();

    for (const user of users) {
      try {
        await emailService.sendDailySummary(user);
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
      }
    }

    return { usersNotified: users.length };
  }
}

module.exports = new Scheduler();
