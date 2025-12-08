# 📋 TaskFlow - Task Manager System

A full-stack task management application with automated email notifications, built according to the provided Software Requirements Specification.

![Task Manager](https://img.shields.io/badge/version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)

## ✨ Features

### Core Functionality
- **User Authentication** - Register, login, JWT-based authentication with refresh tokens
- **Task Management** - Create, read, update, delete tasks with rich metadata
- **Task Properties**:
  - Name (required, max 200 characters)
  - Priority (Low, Medium, High, Critical)
  - Status (Backlog, In Process, On Hold, Complete)
  - Due Date (optional)
  - Details/Description (optional, max 5000 characters)
- **Filtering & Search** - Filter by status, priority, date ranges; full-text search
- **Sorting** - Sort by due date, priority, creation date, name
- **Data Export** - Export tasks to JSON or CSV format

### Email Notifications
- **Daily Summary Emails** - Configurable delivery time
- **Task Categories in Emails**:
  - Overdue tasks
  - Due today
  - Upcoming tasks
- **Productivity Tips** - 20 randomly selected tips included in emails
- **Email Preferences** - Toggle notifications, customize content

### Dashboard
- **Statistics Overview** - Overdue, due today, active, completed counts
- **Visual Breakdown** - Tasks by status and priority
- **Recent Tasks** - Quick view of latest tasks

## 🏗 Architecture

```
task-manager/
├── backend/                 # Node.js/Express API
│   ├── server.js           # Main server entry
│   ├── db.js               # SQLite database setup
│   ├── routes.js           # API routes
│   ├── auth.js             # JWT authentication
│   ├── emailService.js     # Email generation & sending
│   └── scheduler.js        # Cron jobs for automation
├── frontend/               # React SPA
│   ├── src/
│   │   ├── App.js          # Main app with auth context
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styling
│   └── public/
└── database/               # SQLite database files
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+

### Installation

1. **Clone and install dependencies:**
```bash
cd task-manager

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

2. **Start the application:**

**Option A: Run both servers (recommended for development)**
```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend  
cd frontend && npm start
```

**Option B: Use the startup script**
```bash
chmod +x start.sh
./start.sh
```

3. **Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh-token` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |

### User Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/me` | Update user profile |
| PUT | `/api/users/me/password` | Change password |
| GET | `/api/users/me/preferences` | Get preferences |
| PUT | `/api/users/me/preferences` | Update preferences |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (with filters/pagination) |
| POST | `/api/tasks` | Create new task |
| GET | `/api/tasks/:id` | Get specific task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task (soft delete) |
| PATCH | `/api/tasks/:id/status` | Update task status only |
| GET | `/api/tasks/stats/summary` | Get task statistics |
| POST | `/api/tasks/reorder` | Reorder tasks |
| GET | `/api/tasks/export/data` | Export tasks |
| POST | `/api/tasks/import` | Import tasks |

### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/test` | Send test email |
| GET | `/api/email/preview` | Preview email content |

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- JWT access tokens (1 hour expiry)
- JWT refresh tokens (7 days expiry)
- Rate limiting (100 requests/minute)
- CORS protection
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention (parameterized queries)

## 📧 Email System

The email system simulates sending by logging to console. For production:

1. Install an email service SDK (e.g., SendGrid, Amazon SES, Mailgun)
2. Update `backend/emailService.js`:
```javascript
// Replace the sendEmail method with actual implementation
async sendEmail(to, subject, htmlContent) {
  // Example with SendGrid:
  await sgMail.send({
    to,
    from: 'noreply@yourdomain.com',
    subject,
    html: htmlContent
  });
}
```

## ⏰ Background Jobs

The scheduler runs:
- **Hourly**: Check for users needing daily summary emails
- **Daily at 3 AM**: Permanently delete tasks soft-deleted > 30 days ago
- **Daily at 4 AM**: Clean up expired sessions

## 🎨 Design System

The UI follows a "deep space" aesthetic with:
- Dark backgrounds (#0f0f1a, #1a1a2e)
- Purple accent gradient
- Space Grotesk (display) + DM Sans (body) typography
- Subtle animations and hover effects
- Responsive design for all devices

## 📋 SRS Compliance

This implementation covers the following SRS requirements:

### Functional Requirements
- ✅ FR-UM-001 to FR-UM-013: User Management
- ✅ FR-TM-001 to FR-TM-022: Task Management
- ✅ FR-EN-001 to FR-EN-017: Email Notifications
- ✅ FR-DM-001 to FR-DM-012: Data Management
- ✅ FR-WA-001 to FR-WA-015: Web Application Interface

### Non-Functional Requirements
- ✅ NFR-P: Performance optimization
- ✅ NFR-S: Security measures
- ✅ NFR-R: Reliability features
- ✅ NFR-U: Usability and responsiveness
- ✅ NFR-M: Code maintainability

### Database Schema
- ✅ Users table with all specified fields
- ✅ Tasks table with all specified fields
- ✅ Productivity tips table (20 seeded tips)
- ✅ Sessions table for refresh tokens
- ✅ Password reset tokens table
- ✅ Proper indexes for performance

## 🔧 Configuration

Environment variables (set in production):
```bash
PORT=3001                          # Backend port
JWT_SECRET=your-secret-key         # JWT signing secret
NODE_ENV=production               # Environment mode
```

## 📝 License

MIT License - see LICENSE file for details.

---

Built with ❤️ following the Task Manager SRS
