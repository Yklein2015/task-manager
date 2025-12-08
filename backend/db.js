const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'taskmanager.db');

let db = null;
let SQL = null;

// Wrapper to make sql.js work like better-sqlite3
class DatabaseWrapper {
  constructor(database) {
    this.database = database;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        try {
          self.database.run(sql, params);
          return { changes: self.database.getRowsModified() };
        } catch (e) {
          console.error('SQL Error:', e.message, sql);
          throw e;
        }
      },
      get(...params) {
        try {
          const stmt = self.database.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('SQL Error:', e.message, sql);
          throw e;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = self.database.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('SQL Error:', e.message, sql);
          throw e;
        }
      }
    };
  }

  exec(sql) {
    try {
      this.database.exec(sql);
    } catch (e) {
      console.error('SQL Exec Error:', e.message, sql);
      throw e;
    }
  }

  pragma(pragma) {
    this.database.exec(`PRAGMA ${pragma}`);
  }

  transaction(fn) {
    return () => {
      this.database.exec('BEGIN TRANSACTION');
      try {
        fn();
        this.database.exec('COMMIT');
      } catch (e) {
        this.database.exec('ROLLBACK');
        throw e;
      }
    };
  }

  save() {
    const data = this.database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

async function initializeDatabase() {
  SQL = await initSqlJs();
  
  // Try to load existing database
  let database;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }
  
  db = new DatabaseWrapper(database);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      email_notification_enabled INTEGER DEFAULT 1,
      email_notification_time INTEGER DEFAULT 8,
      include_overdue INTEGER DEFAULT 1,
      include_due_today INTEGER DEFAULT 1,
      include_upcoming INTEGER DEFAULT 1,
      include_productivity_tips INTEGER DEFAULT 1,
      reminder_24h_enabled INTEGER DEFAULT 0,
      overdue_notification_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      task_name TEXT NOT NULL,
      priority TEXT DEFAULT 'Medium',
      date_created TEXT DEFAULT CURRENT_TIMESTAMP,
      due_date TEXT,
      status TEXT DEFAULT 'Backlog',
      details TEXT,
      sort_order INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      deleted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS productivity_tips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tip_text TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_user_deleted ON tasks(user_id, is_deleted)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON tasks(user_id, due_date)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status)`);

  // Seed productivity tips if empty
  const tipCount = db.prepare('SELECT COUNT(*) as count FROM productivity_tips').get();
  if (tipCount.count === 0) {
    seedProductivityTips();
  }

  // Save database
  db.save();

  console.log('Database initialized successfully');
  return db;
}

function seedProductivityTips() {
  const tips = [
    "Start your day by tackling the most challenging task first - you'll have more energy and focus.",
    "Break large tasks into smaller, manageable chunks. Progress fuels motivation.",
    "Use the 2-minute rule: if a task takes less than 2 minutes, do it now.",
    "Schedule specific times for checking emails rather than constantly monitoring your inbox.",
    "Take regular breaks using the Pomodoro Technique: 25 minutes of focus, then 5 minutes rest.",
    "Review your tasks each morning and identify your top 3 priorities for the day.",
    "Eliminate distractions by putting your phone on silent or in another room while working.",
    "Group similar tasks together to maintain momentum and reduce context switching.",
    "End each day by planning tomorrow - you'll start with clarity and purpose.",
    "Celebrate small wins! Completing tasks releases dopamine and builds positive habits.",
    "Set realistic deadlines for yourself, even for tasks without external due dates.",
    "Learn to say no to tasks that don't align with your priorities.",
    "Use time-blocking to dedicate specific hours to focused work on important tasks.",
    "Review completed tasks weekly to recognize your progress and adjust your approach.",
    "Keep your workspace clean and organized - a clear space promotes clear thinking.",
    "Tackle your most important work during your peak energy hours.",
    "Visualize completing your tasks - mental rehearsal improves performance.",
    "Practice single-tasking: focus on one task until completion before starting another.",
    "Set boundaries around your work time to maintain healthy work-life balance.",
    "Reflect on what makes you procrastinate and create strategies to overcome it."
  ];

  tips.forEach(tip => {
    db.prepare('INSERT INTO productivity_tips (tip_text) VALUES (?)').run(tip);
  });
  db.save();
  console.log('Productivity tips seeded successfully');
}

function getDb() {
  return db;
}

// Auto-save periodically
setInterval(() => {
  if (db) {
    db.save();
  }
}, 30000); // Save every 30 seconds

module.exports = { initializeDatabase, getDb };
