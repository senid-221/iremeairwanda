const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { SESSION_SECRET } = require('../config/secrets');

const prisma = new PrismaClient();

const PUBLIC_ROLES = ['STUDENT', 'TEACHER', 'PARENT', 'HEADTEACHER'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
  };
}

async function createRoleRecord(userId, role) {
  if (role === 'STUDENT') {
    return prisma.studentProfile.create({ data: { userId } });
  }
  if (role === 'PARENT') {
    return prisma.parentProfile.create({ data: { userId } });
  }
  if (role === 'HEADTEACHER') {
    return prisma.schoolStaffProfile.create({ data: { userId, position: 'headteacher' } });
  }
  return null;
}

router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body || {};

    if (!fullName || String(fullName).trim().length < 3) {
      return res.status(400).json({ error: 'Full name is required (min 3 characters)' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const selectedRole = role || 'STUDENT';
    if (!PUBLIC_ROLES.includes(selectedRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const emailNormalized = normalizeEmail(email);

    const existing = await prisma.user.findUnique({ where: { emailNormalized } });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    // Teachers and headteachers require admin verification before activation; students and parents are active immediately.
    const status = (selectedRole === 'TEACHER' || selectedRole === 'HEADTEACHER') ? 'PENDING' : 'ACTIVE';

    const user = await prisma.user.create({
      data: {
        email,
        emailNormalized,
        fullName: String(fullName).trim(),
        passwordHash,
        role: selectedRole,
        status,
        emailVerified: false,
      },
    });

    await createRoleRecord(user.id, selectedRole);

    res.status(201).json({
      message: 'Registration successful',
      user: sanitizeUser(user),
      requiresVerification: status === 'PENDING',
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailNormalized = normalizeEmail(email);
    const user = await prisma.user.findUnique({ where: { emailNormalized } });

    if (!user || !user.passwordHash || user.deletedAt) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await bcrypt.compare(String(password), user.passwordHash);
    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      res.json({
        message: 'Login successful',
        user: sanitizeUser(user),
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ error: 'Google login is not configured' });
  }
  const role = req.query.role || 'STUDENT';
  const allowedRoles = ['STUDENT', 'TEACHER', 'PARENT'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role for Google registration' });
  }
  req.session.pendingRole = role;
  next();
}, passport.authenticate('google', {
  scope: ['profile', 'email'],
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html?error=auth_failed' }),
  (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const user = req.user;

    const oauthToken = jwt.sign(
      { userId: user.id, role: user.role, status: user.status },
      SESSION_SECRET,
      { expiresIn: '60s' }
    );

    res.redirect(frontendUrl + '/oauth-callback.html#token=' + oauthToken);
  }
);

router.post('/exchange-token', (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  let payload;
  try {
    payload = jwt.verify(token, SESSION_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  prisma.user.findUnique({
    where: { id: payload.userId },
    include: { studentProfile: true, parentProfile: true },
  }).then((user) => {
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to establish session' });
      }

      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }).catch(() => {});

      res.json({
        message: 'Session established',
        user: sanitizeUser(user),
      });
    });
  }).catch((err) => {
    console.error('Exchange token error:', err);
    res.status(500).json({ error: 'Failed to exchange token' });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    preferredLanguage: user.preferredLanguage,
    timezone: user.timezone,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    studentProfile: user.studentProfile || null,
    parentProfile: user.parentProfile || null,
  });
});

router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, phone, preferredLanguage, timezone } = req.body || {};
    const updates = {};

    if (fullName !== undefined) {
      const trimmed = String(fullName).trim();
      if (trimmed.length < 3) {
        return res.status(400).json({ error: 'Full name must be at least 3 characters' });
      }
      updates.fullName = trimmed;
    }
    if (phone !== undefined) updates.phone = phone ? String(phone).trim() : null;
    if (preferredLanguage !== undefined) {
      if (!['en', 'rw'].includes(preferredLanguage)) {
        return res.status(400).json({ error: 'Invalid language. Supported: en, rw' });
      }
      updates.preferredLanguage = preferredLanguage;
    }
    if (timezone !== undefined) updates.timezone = timezone ? String(timezone).trim() : null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: { id: true, email: true, fullName: true, phone: true, preferredLanguage: true, timezone: true },
    });

    res.json({ message: 'Profile updated', user: updated });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/logout', (req, res) => {
  if (!req.user) {
    return res.json({ message: 'Already logged out' });
  }

  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destruction error:', sessionErr);
      }
      res.clearCookie('ireme.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

router.get('/status', (req, res) => {
  if (req.isAuthenticated() && req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        fullName: req.user.fullName,
        role: req.user.role,
        status: req.user.status,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;
