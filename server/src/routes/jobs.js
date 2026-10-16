var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
var { requireAuth, requireRole } = require('../middleware/auth');

var prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Internal secret validation middleware (for system endpoints)
// ---------------------------------------------------------------------------
function requireInternalSecret(req, res, next) {
  var secret = process.env.ADMIN_BOOTSTRAP_SECRET;

  if (!secret || secret === 'your_one_time_admin_bootstrap_secret_here') {
    return res.status(503).json({ error: 'Internal API is not configured' });
  }

  var provided = req.headers['x-internal-secret'] || req.headers['x-bootstrap-secret'];
  if (provided !== secret) {
    return res.status(403).json({ error: 'Invalid internal secret' });
  }

  return next();
}

// ---------------------------------------------------------------------------
// System endpoints (internal, no auth – validated via secret header)
// ---------------------------------------------------------------------------

// POST / — Create a new background job (for internal use)
router.post('/', requireInternalSecret, async function (req, res) {
  var { jobType, jobName, payload, priority, scheduledAt, maxAttempts } = req.body;

  if (!jobType || !jobName) {
    return res.status(400).json({ error: 'jobType and jobName are required' });
  }

  try {
    var job = await prisma.backgroundJob.create({
      data: {
        jobType: jobType,
        jobName: jobName,
        status: 'queued',
        payload: payload || {},
        priority: priority || 0,
        maxAttempts: maxAttempts || 3,
        attempts: 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
      },
    });

    return res.status(201).json({ message: 'Job created', job: job });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to create job' });
  }
});

// PATCH /:id — Update job status (for worker use)
router.patch('/:id', requireInternalSecret, async function (req, res) {
  var id = req.params.id;
  var { status, result, error, attempts } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'status is required' });
  }

  var validStatuses = ['queued', 'running', 'completed', 'failed', 'cancelled'];
  if (validStatuses.indexOf(status) === -1) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    var existing = await prisma.backgroundJob.findUnique({ where: { id: id } });
    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    var updateData = { status: status };

    if (result !== undefined) updateData.result = result;
    if (error !== undefined) updateData.error = error;
    if (attempts !== undefined) updateData.attempts = attempts;

    if (status === 'running' && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    var job = await prisma.backgroundJob.update({
      where: { id: id },
      data: updateData,
    });

    return res.json({ message: 'Job updated', job: job });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to update job' });
  }
});

// ---------------------------------------------------------------------------
// Admin endpoints (requireAuth + requireRole)
// ---------------------------------------------------------------------------

// GET /stats — Job statistics (must be before /:id to avoid route conflict)
router.get('/stats', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var total = await prisma.backgroundJob.count();

    // Counts by status
    var statuses = ['queued', 'running', 'completed', 'failed', 'cancelled'];
    var statusCounts = {};
    for (var i = 0; i < statuses.length; i++) {
      var s = statuses[i];
      statusCounts[s] = await prisma.backgroundJob.count({ where: { status: s } });
    }

    // Counts by jobType
    var allJobs = await prisma.backgroundJob.findMany({
      select: { jobType: true },
    });
    var typeCounts = {};
    for (var j = 0; j < allJobs.length; j++) {
      var t = allJobs[j].jobType;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }

    // Average completion time (in milliseconds) for completed jobs
    var completedJobs = await prisma.backgroundJob.findMany({
      where: { status: 'completed', startedAt: { not: null }, completedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    });

    var avgCompletionTime = null;
    if (completedJobs.length > 0) {
      var totalMs = 0;
      for (var k = 0; k < completedJobs.length; k++) {
        totalMs += completedJobs[k].completedAt.getTime() - completedJobs[k].startedAt.getTime();
      }
      avgCompletionTime = Math.round(totalMs / completedJobs.length);
    }

    // Failed job rate
    var failedRate = total > 0 ? Math.round((statusCounts['failed'] / total) * 10000) / 100 : 0;

    return res.json({
      total: total,
      byStatus: statusCounts,
      byJobType: typeCounts,
      avgCompletionTimeMs: avgCompletionTime,
      failedRatePercent: failedRate,
    });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to fetch job statistics' });
  }
});

// DELETE /completed — Clean up old completed jobs (older than 7 days)
router.delete('/completed', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    var result = await prisma.backgroundJob.deleteMany({
      where: {
        status: { in: ['completed', 'cancelled'] },
        completedAt: { lt: sevenDaysAgo },
      },
    });

    return res.json({
      message: 'Cleanup complete',
      deletedCount: result.count,
    });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to clean up jobs' });
  }
});

// GET / — List all background jobs
router.get('/', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var status = req.query.status;
    var jobType = req.query.jobType;
    var limit = parseInt(req.query.limit) || 50;
    var offset = parseInt(req.query.offset) || 0;

    var where = {};
    if (status) where.status = status;
    if (jobType) where.jobType = jobType;

    var jobs = await prisma.backgroundJob.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    var total = await prisma.backgroundJob.count({ where: where });

    // Counts by status for the filtered (or full) set
    var allStatuses = ['queued', 'running', 'completed', 'failed', 'cancelled'];
    var countsByStatus = {};
    for (var i = 0; i < allStatuses.length; i++) {
      var st = allStatuses[i];
      countsByStatus[st] = await prisma.backgroundJob.count({ where: { status: st } });
    }

    return res.json({
      jobs: jobs,
      pagination: {
        total: total,
        limit: limit,
        offset: offset,
      },
      countsByStatus: countsByStatus,
    });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /:id — Get job details
router.get('/:id', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var job = await prisma.backgroundJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json({ job: job });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /:id/retry — Retry a failed job
router.post('/:id/retry', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var job = await prisma.backgroundJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed jobs can be retried' });
    }

    if (job.attempts >= job.maxAttempts) {
      return res.status(400).json({
        error: 'Job has reached maximum attempts (' + job.maxAttempts + ')',
      });
    }

    var updated = await prisma.backgroundJob.update({
      where: { id: req.params.id },
      data: {
        status: 'queued',
        attempts: job.attempts + 1,
        error: null,
        startedAt: null,
        completedAt: null,
      },
    });

    return res.json({ message: 'Job queued for retry', job: updated });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to retry job' });
  }
});

// POST /:id/cancel — Cancel a queued or running job
router.post('/:id/cancel', requireAuth, requireRole('ADMIN', 'SUPER_ADMIN'), async function (req, res) {
  try {
    var job = await prisma.backgroundJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'queued' && job.status !== 'running') {
      return res.status(400).json({
        error: 'Only queued or running jobs can be cancelled',
      });
    }

    var updated = await prisma.backgroundJob.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
    });

    return res.json({ message: 'Job cancelled', job: updated });
  } catch (err) {
    console.error('jobs error:', err);
    return res.status(500).json({ error: 'Failed to cancel job' });
  }
});

module.exports = router;
