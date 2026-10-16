/**
 * Notification endpoints — user notification listing, read/unread management,
 * preferences, admin broadcast, and delivery statistics for the IREME Rwanda
 * education platform.
 */
var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth, requireRole } = require('../middleware/auth');

var prisma = new PrismaClient();

// ===========================================================================
// STUDENT / USER ENDPOINTS (requireAuth)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. GET / — List user's notifications with unread count
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async function (req, res) {
  try {
    var limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    var offset = parseInt(req.query.offset, 10) || 0;
    var isRead = req.query.isRead;
    var type = String(req.query.type || '');
    var priority = String(req.query.priority || '');

    var where = { userId: req.user.id };

    if (isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true';
    }
    if (type) {
      where.type = type;
    }
    if (priority) {
      where.priority = priority;
    }

    var [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where: where }),
      prisma.notification.count({
        where: { userId: req.user.id, isRead: false },
      }),
    ]);

    res.json({
      notifications: notifications,
      total: total,
      unreadCount: unreadCount,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /unread-count — Quick unread count for navbar badge
// ---------------------------------------------------------------------------
router.get('/unread-count', requireAuth, async function (req, res) {
  try {
    var unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    res.json({ unreadCount: unreadCount });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// ---------------------------------------------------------------------------
// 4. PATCH /read-all — Mark all notifications as read
//    NOTE: Must be defined BEFORE /:id to avoid route conflicts.
// ---------------------------------------------------------------------------
router.patch('/read-all', requireAuth, async function (req, res) {
  try {
    var result = await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({
      message: 'All notifications marked as read',
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// ---------------------------------------------------------------------------
// 3. PATCH /:id/read — Mark a single notification as read
// ---------------------------------------------------------------------------
router.patch('/:id/read', requireAuth, async function (req, res) {
  try {
    var notificationId = req.params.id;

    var notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: 'You do not have permission to modify this notification' });
    }

    var updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    res.json({ notification: updated });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /preferences — Get user's notification preferences
// ---------------------------------------------------------------------------
router.get('/preferences', requireAuth, async function (req, res) {
  try {
    var preferences = await prisma.notificationPreference.findMany({
      where: { userId: req.user.id },
      orderBy: [{ notificationType: 'asc' }, { channel: 'asc' }],
    });

    res.json({ preferences: preferences });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// ---------------------------------------------------------------------------
// 6. PUT /preferences — Update notification preferences
// ---------------------------------------------------------------------------
router.put('/preferences', requireAuth, async function (req, res) {
  try {
    var body = req.body || {};
    var preferences = body.preferences;

    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: 'preferences must be an array' });
    }

    // Validate each entry
    for (var i = 0; i < preferences.length; i++) {
      var pref = preferences[i];
      if (!pref.notificationType) {
        return res.status(400).json({ error: 'Each preference must include notificationType' });
      }
      if (!pref.channel) {
        return res.status(400).json({ error: 'Each preference must include channel' });
      }
      if (typeof pref.isEnabled !== 'boolean') {
        return res.status(400).json({ error: 'Each preference must include isEnabled (boolean)' });
      }
    }

    // Upsert each preference inside a transaction
    var updated = await prisma.$transaction(async function (tx) {
      var results = [];
      for (var j = 0; j < preferences.length; j++) {
        var pref = preferences[j];

        // Check if preference already exists
        var existing = await tx.notificationPreference.findFirst({
          where: {
            userId: req.user.id,
            notificationType: pref.notificationType,
            channel: pref.channel,
          },
        });

        var record;
        if (existing) {
          record = await tx.notificationPreference.update({
            where: { id: existing.id },
            data: { isEnabled: pref.isEnabled },
          });
        } else {
          record = await tx.notificationPreference.create({
            data: {
              userId: req.user.id,
              notificationType: pref.notificationType,
              channel: pref.channel,
              isEnabled: pref.isEnabled,
            },
          });
        }

        results.push(record);
      }
      return results;
    });

    res.json({ preferences: updated });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ===========================================================================
// ADMIN / SYSTEM ENDPOINTS (requireAuth + requireRole)
// ===========================================================================

// ---------------------------------------------------------------------------
// 9. GET /stats — Notification statistics (admin)
//    NOTE: Must be defined BEFORE /broadcast and /:id to avoid route conflicts.
// ---------------------------------------------------------------------------
router.get('/stats', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var [
      totalNotifications,
      totalDeliveries,
      deliveredCount,
      failedCount,
      pendingCount,
      byType,
      byChannel,
    ] = await Promise.all([
      prisma.notification.count(),
      prisma.notificationDelivery.count(),
      prisma.notificationDelivery.count({ where: { status: 'delivered' } }),
      prisma.notificationDelivery.count({ where: { status: 'failed' } }),
      prisma.notificationDelivery.count({ where: { status: 'pending' } }),
      prisma.notification.groupBy({
        by: ['type'],
        _count: { id: true },
      }),
      prisma.notificationDelivery.groupBy({
        by: ['channel'],
        _count: { id: true },
      }),
    ]);

    // Reshape type breakdown
    var typeBreakdown = {};
    byType.forEach(function (entry) {
      typeBreakdown[entry.type] = entry._count.id;
    });

    // Reshape channel breakdown
    var channelBreakdown = {};
    byChannel.forEach(function (entry) {
      channelBreakdown[entry.channel] = entry._count.id;
    });

    res.json({
      totalNotifications: totalNotifications,
      deliveries: {
        total: totalDeliveries,
        delivered: deliveredCount,
        failed: failedCount,
        pending: pendingCount,
      },
      byType: typeBreakdown,
      byChannel: channelBreakdown,
    });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// ---------------------------------------------------------------------------
// 8. POST /broadcast — Send notification to multiple users
// ---------------------------------------------------------------------------
router.post('/broadcast', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var data = req.body || {};

    if (!data.userIds || !Array.isArray(data.userIds) || data.userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required and must not be empty' });
    }
    if (!data.type) {
      return res.status(400).json({ error: 'type is required' });
    }
    if (!data.title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!data.message) {
      return res.status(400).json({ error: 'message is required' });
    }

    var notifications = await prisma.$transaction(async function (tx) {
      var created = [];
      for (var i = 0; i < data.userIds.length; i++) {
        var notification = await tx.notification.create({
          data: {
            userId: data.userIds[i],
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
            entityType: data.entityType || null,
            entityId: data.entityId || null,
            priority: data.priority || 'normal',
            isRead: false,
          },
        });
        created.push(notification);
      }
      return created;
    });

    res.status(201).json({
      message: 'Broadcast sent successfully',
      count: notifications.length,
      notifications: notifications,
    });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to broadcast notifications' });
  }
});

// ---------------------------------------------------------------------------
// 7. POST / — Create a single notification (admin/system)
// ---------------------------------------------------------------------------
router.post('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var data = req.body || {};

    if (!data.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    if (!data.type) {
      return res.status(400).json({ error: 'type is required' });
    }
    if (!data.title) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!data.message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Verify the target user exists
    var targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Create the notification
    var notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        entityType: data.entityType || null,
        entityId: data.entityId || null,
        priority: data.priority || 'normal',
        isRead: false,
      },
    });

    // Check user preferences for email delivery
    var emailPref = await prisma.notificationPreference.findFirst({
      where: {
        userId: data.userId,
        notificationType: data.type,
        channel: 'email',
        isEnabled: true,
      },
    });

    var emailTriggered = false;
    if (emailPref && targetUser.email) {
      // Create a delivery record for email
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'email',
          status: 'pending',
          deliveredAt: null,
          retryCount: 0,
          providerRef: null,
        },
      });
      emailTriggered = true;
      // NOTE: Actual email sending would be handled by a background worker
      // that picks up pending NotificationDelivery records.
    }

    res.status(201).json({
      notification: notification,
      emailTriggered: emailTriggered,
    });
  } catch (error) {
    console.error('notification error:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

module.exports = router;
