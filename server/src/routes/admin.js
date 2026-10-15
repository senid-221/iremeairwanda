const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireRole } = require('../middleware/auth');

const prisma = new PrismaClient();

router.post('/bootstrap', async (req, res) => {
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!bootstrapSecret || bootstrapSecret === 'your_one_time_admin_bootstrap_secret_here') {
    return res.status(403).json({ error: 'Admin bootstrap is not configured' });
  }

  const providedSecret = req.headers['x-bootstrap-secret'];
  if (providedSecret !== bootstrapSecret) {
    return res.status(403).json({ error: 'Invalid bootstrap secret' });
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
  });

  if (existingAdmin) {
    return res.status(403).json({ error: 'Admin already exists. Bootstrap is disabled.' });
  }

  const { email, fullName, password } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ error: 'Email and fullName are required' });
  }

  try {
    const admin = await prisma.user.create({
      data: {
        email,
        fullName,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_BOOTSTRAP',
        entityType: 'User',
        entityId: admin.id,
        targetId: admin.id,
        metadata: { email, fullName, role: 'SUPER_ADMIN' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(201).json({
      message: 'Admin account created successfully',
      user: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to create admin account' });
  }
});

router.post('/users', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { email, fullName, role, status } = req.body;

  if (!email || !fullName || !role) {
    return res.status(400).json({ error: 'email, fullName, and role are required' });
  }

  const allowedRoles = ['STUDENT', 'TEACHER', 'PARENT', 'HEADTEACHER', 'ADMIN'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  if (role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Cannot create SUPER_ADMIN through this endpoint' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && (role === 'ADMIN' || role === 'HEADTEACHER')) {
    return res.status(403).json({ error: 'Only SUPER_ADMIN can create admin or headteacher accounts' });
  }

  try {
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        role: role,
        status: status || 'PENDING',
        emailVerified: false,
      },
    });

    if (role === 'STUDENT') {
      await prisma.studentRecord.create({ data: { userId: user.id } });
    } else if (role === 'TEACHER') {
      await prisma.teacherRecord.create({ data: { userId: user.id } });
    } else if (role === 'PARENT') {
      await prisma.parentRecord.create({ data: { userId: user.id } });
    }

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_CREATE_USER',
        entityType: 'User',
        entityId: user.id,
        creatorId: req.user.id,
        targetId: user.id,
        metadata: { email, fullName, role, status: status || 'PENDING' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/users', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const roleFilter = req.query.role;
    const statusFilter = req.query.status;
    const search = req.query.search;

    const where = {};
    if (roleFilter) where.role = roleFilter;
    if (statusFilter) where.status = statusFilter;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (req.user.role !== 'SUPER_ADMIN') {
      where.role = { not: 'SUPER_ADMIN' };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
          lastLoginAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.patch('/users/:id/role', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ error: 'role is required' });
  }

  const allowedRoles = ['STUDENT', 'TEACHER', 'PARENT', 'HEADTEACHER', 'ADMIN'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot change SUPER_ADMIN role' });
    }

    const oldRole = targetUser.role;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_CHANGE_ROLE',
        entityType: 'User',
        entityId: id,
        creatorId: req.user.id,
        targetId: id,
        metadata: { oldRole, newRole: role },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.json({ message: 'Role updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.patch('/users/:id/status', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  const allowedStatuses = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Cannot modify SUPER_ADMIN account' });
    }

    const oldStatus = targetUser.status;
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, email: true, fullName: true, role: true, status: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_CHANGE_STATUS',
        entityType: 'User',
        entityId: id,
        creatorId: req.user.id,
        targetId: id,
        metadata: { oldStatus, newStatus: status },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    res.json({ message: 'Status updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Change status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
