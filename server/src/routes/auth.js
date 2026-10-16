const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../middleware/auth');
const { uploadCV, uploadFace } = require('../middleware/upload');
const { SESSION_SECRET } = require('../config/secrets');
const crypto = require('crypto');

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
    profileComplete: user.profileComplete || false,
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
    res.clearCookie('ireme.sid', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    return res.json({ message: 'Already logged out' });
  }

  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('Session destruction error:', sessionErr);
      }
      res.clearCookie('ireme.sid', { path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
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
        profileComplete: req.user.profileComplete || false,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

// ---------------------------------------------------------------------------
// Password Reset Flow
// ---------------------------------------------------------------------------

router.post('/forgot-password', async (req, res) => {
  try {
    var email = req.body && req.body.email ? String(req.body.email).trim() : '';
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    var emailNormalized = normalizeEmail(email);
    var user = await prisma.user.findUnique({ where: { emailNormalized: emailNormalized } });

    if (user) {
      var token = crypto.randomUUID();
      var expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: token,
          expiresAt: expiresAt,
        },
      });

      // In production this would send an email. For now, log the token.
      console.log('[Password Reset] Token for', email, ':', token);
    }

    // Always return success to prevent email enumeration
    return res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    var token = req.body && req.body.token ? String(req.body.token).trim() : '';
    var newPassword = req.body && req.body.newPassword ? String(req.body.newPassword) : '';

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    var resetToken = await prisma.passwordResetToken.findUnique({ where: { token: token } });

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    if (resetToken.usedAt) {
      return res.status(400).json({ error: 'This reset token has already been used' });
    }
    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset token has expired' });
    }

    var passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ---------------------------------------------------------------------------
// Email Verification Flow
// ---------------------------------------------------------------------------

router.post('/verify-email/send', requireAuth, async (req, res) => {
  try {
    var token = crypto.randomUUID();
    var expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        userId: req.user.id,
        token: token,
        expiresAt: expiresAt,
      },
    });

    // In production this would send an email. For now, log the token.
    console.log('[Email Verification] Token for user', req.user.id, ':', token);

    return res.json({ message: 'Verification email sent.', token: token });
  } catch (err) {
    console.error('Send verification email error:', err);
    return res.status(500).json({ error: 'Failed to send verification email.' });
  }
});

router.post('/verify-email/confirm', async (req, res) => {
  try {
    var token = req.body && req.body.token ? String(req.body.token).trim() : '';

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    var verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token: token } });

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }
    if (verificationToken.usedAt) {
      return res.status(400).json({ error: 'This verification token has already been used' });
    }
    if (verificationToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This verification token has expired' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: 'Email verified successfully.' });
  } catch (err) {
    console.error('Confirm email error:', err);
    return res.status(500).json({ error: 'Failed to verify email. Please try again.' });
  }
});

router.post('/upload-cv', requireAuth, (req, res) => {
  uploadCV(req, res, function (err) {
    if (err instanceof require('multer').MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    var cvUrl = '/uploads/cvs/' + req.file.filename;
    res.json({ message: 'CV uploaded successfully.', cvUrl: cvUrl });
  });
});

router.post('/upload-face', requireAuth, (req, res) => {
  uploadFace(req, res, function (err) {
    if (err instanceof require('multer').MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    var faceUrl = '/uploads/faces/' + req.file.filename;
    res.json({ message: 'Face scan uploaded successfully.', faceUrl: faceUrl });
  });
});

router.post('/complete-profile', requireAuth, async (req, res) => {
  try {
    var userId = req.user.id;
    var data = req.body;

    var updateData = {};

    if (data.fullName) updateData.fullName = data.fullName;
    if (data.phone) updateData.phone = data.phone;
    if (data.gender) updateData.gender = data.gender;
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.educationTrack) updateData.educationTrack = data.educationTrack;
    if (data.cvUrl) updateData.cvUrl = data.cvUrl;
    if (data.faceScanUrl) updateData.faceScanUrl = data.faceScanUrl;

    var userProfileData = {};
    if (data.province) userProfileData.province = data.province;
    if (data.district) userProfileData.district = data.district;
    if (data.sector) userProfileData.sector = data.sector;
    if (data.cell) userProfileData.cell = data.cell;
    if (data.village) userProfileData.village = data.village;
    if (data.nationalId) userProfileData.nationalId = data.nationalId;
    if (data.nationality) userProfileData.nationality = data.nationality;

    if (Object.keys(userProfileData).length > 0) {
      await prisma.userProfile.upsert({
        where: { userId: userId },
        create: Object.assign({ userId: userId }, userProfileData),
        update: userProfileData
      });
    }

    if (data.role === 'STUDENT' || data.role === 'student') {
      var studentProfileData = {};
      if (data.studentId) studentProfileData.studentId = data.studentId;
      if (data.dateOfBirth) studentProfileData.dateOfBirth = new Date(data.dateOfBirth);
      if (data.gender) studentProfileData.gender = data.gender;
      if (data.nationalId) studentProfileData.nationalId = data.nationalId;
      if (data.nationality) studentProfileData.nationality = data.nationality;
      if (data.bloodGroup) studentProfileData.bloodGroup = data.bloodGroup;
      if (data.emergencyContactName) studentProfileData.emergencyContactName = data.emergencyContactName;
      if (data.emergencyContactPhone) studentProfileData.emergencyContactPhone = data.emergencyContactPhone;
      if (data.previousSchool) studentProfileData.previousSchool = data.previousSchool;

      if (Object.keys(studentProfileData).length > 0) {
        await prisma.studentProfile.upsert({
          where: { userId: userId },
          create: Object.assign({ userId: userId }, studentProfileData),
          update: studentProfileData
        });
      }

      if (data.schoolId && data.educationLevelId) {
        var enrollmentData = {
          studentProfileId: (await prisma.studentProfile.findUnique({ where: { userId: userId } })).id,
          schoolId: data.schoolId,
          educationLevelId: data.educationLevelId,
          academicYearId: data.academicYearId || (await prisma.academicYear.findFirst({ where: { isCurrent: true } })).id,
          status: 'active'
        };
        if (data.classId) enrollmentData.classId = data.classId;
        if (data.curriculumProgrammeId) enrollmentData.curriculumProgrammeId = data.curriculumProgrammeId;
        if (data.curriculumOptionId) enrollmentData.curriculumOptionId = data.curriculumOptionId;

        await prisma.studentEnrollment.upsert({
          where: {
            studentProfileId_schoolId: {
              studentProfileId: enrollmentData.studentProfileId,
              schoolId: data.schoolId
            }
          },
          create: enrollmentData,
          update: { classId: enrollmentData.classId, educationLevelId: enrollmentData.educationLevelId }
        });
      }
    }

    if (data.schoolId && (data.role === 'TEACHER' || data.role === 'teacher')) {
      var existingMembership = await prisma.schoolMembership.findUnique({
        where: { schoolId_userId: { schoolId: data.schoolId, userId: userId } }
      });
      if (!existingMembership) {
        await prisma.schoolMembership.create({
          data: {
            schoolId: data.schoolId,
            userId: userId,
            role: 'teacher',
            status: 'active'
          }
        });
      }
    }

    updateData.profileComplete = true;

    var updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { userProfile: true, studentProfile: true }
    });

    return res.json({ message: 'Profile completed successfully.', user: sanitizeUser(updatedUser) });
  } catch (err) {
    console.error('Complete profile error:', err);
    return res.status(500).json({ error: 'Failed to complete profile. Please try again.' });
  }
});

module.exports = router;
