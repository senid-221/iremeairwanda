function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    return next();
  };
}

function requireActive(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.status !== 'ACTIVE') {
    return res.status(403).json({
      error: 'Account is not active',
      status: req.user.status,
    });
  }
  return next();
}

function requireVerified(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }
  return next();
}

module.exports = { requireAuth, requireRole, requireActive, requireVerified };
