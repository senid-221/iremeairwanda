const express = require('express');
const router = express.Router();
const passport = require('passport');
const { requireAuth } = require('../middleware/auth');

router.get('/google', (req, res, next) => {
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

    let redirectPath = '/student-dashboard.html';
    if (user.role === 'TEACHER') {
      redirectPath = user.teacherRecord?.isVerified ? '/teacher-dashboard.html' : '/pending-approval.html';
    } else if (user.role === 'PARENT') {
      redirectPath = '/parent-dashboard.html';
    } else if (user.role === 'HEADTEACHER') {
      redirectPath = '/headteacher-dashboard.html';
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      redirectPath = '/admin-dashboard.html';
    }

    res.redirect(frontendUrl + redirectPath);
  }
);

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
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    studentRecord: user.studentRecord || null,
    teacherRecord: user.teacherRecord || null,
    parentRecord: user.parentRecord || null,
  });
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
