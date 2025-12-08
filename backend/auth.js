const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  
  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { v4: uuidv4 } = require('uuid');
  const db = getDb();
  
  db.prepare(`
    INSERT INTO sessions (id, user_id, refresh_token, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), userId, refreshToken, expiresAt);
  db.save();
  
  return { accessToken, refreshToken };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    
    // Verify user exists
    const user = db.prepare('SELECT id, email, timezone FROM users WHERE id = ?').get(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    const db = getDb();
    
    // Check if token exists in database
    const session = db.prepare(`
      SELECT * FROM sessions 
      WHERE refresh_token = ? AND expires_at > datetime('now')
    `).get(token);
    
    if (!session) {
      return null;
    }
    
    return decoded;
  } catch (error) {
    return null;
  }
}

function invalidateRefreshToken(token) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE refresh_token = ?').run(token);
  db.save();
}

function invalidateAllUserSessions(userId) {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  db.save();
}

module.exports = {
  JWT_SECRET,
  generateTokens,
  authenticateToken,
  verifyRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserSessions
};
