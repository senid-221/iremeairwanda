/**
 * DB-backed worker for video generation jobs.
 *
 * Claims the oldest queued job with an atomic updateMany (status queued →
 * processing), caps concurrency, requeues stale processing jobs (e.g. after
 * a crash or deploy), retries failures with backoff up to maxAttempts, and
 * runs periodic temp-asset cleanup. Only active when VIDEO_GENERATION_ENABLED
 * is true and required credentials are present — otherwise it logs honestly
 * and stays idle.
 */
var videoConfig = require('../../config/video');
var pipeline = require('./pipeline');
var { PrismaClient } = require('@prisma/client');

var prisma = new PrismaClient();
var activeCount = 0;
var pollTimer = null;
var cleanupTimer = null;
var staleTimer = null;
var started = false;

function log() {
  var args = Array.prototype.slice.call(arguments);
  console.log.apply(console, ['[video-worker]'].concat(args));
}

async function tryClaimJob() {
  if (activeCount >= videoConfig.get().limits.maxConcurrentJobs) return false;

  var candidates = await prisma.videoGenerationJob.findMany({
    where: { status: 'queued' },
    orderBy: { queuedAt: 'asc' },
    take: 1,
  });
  var candidate = candidates[0];
  if (!candidate) return false;

  // Atomic claim: only one worker instance can flip this row to processing.
  var claimed = await prisma.videoGenerationJob.updateMany({
    where: { id: candidate.id, status: 'queued' },
    data: { status: 'processing', stage: 'planning', attempts: { increment: 1 }, startedAt: candidate.startedAt || new Date() },
  });
  if (claimed.count !== 1) return false;

  activeCount++;
  log('claimed job', candidate.id, `(active: ${activeCount})`);
  pipeline.runJob(candidate.id)
    .then(function (result) {
      log('job', candidate.id, 'finished:', JSON.stringify(result));
    })
    .catch(function (err) {
      if (err && err.isCancellation) {
        log('job', candidate.id, 'cancelled');
        return;
      }
      log('job', candidate.id, 'failed:', err.message);
      return maybeRequeue(candidate.id);
    })
    .catch(function (err) {
      log('requeue error:', err.message);
    })
    .then(function () {
      activeCount = Math.max(0, activeCount - 1);
    });
  return true;
}

async function maybeRequeue(jobId) {
  var job = await prisma.videoGenerationJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'failed') return;
  if (job.attempts >= job.maxAttempts) {
    log('job', jobId, 'hit max attempts; staying failed');
    return;
  }
  var delayMs = Math.min(60000, 5000 * Math.pow(2, job.attempts));
  log('requeueing job', jobId, `in ${delayMs / 1000}s (attempt ${job.attempts + 1}/${job.maxAttempts})`);
  setTimeout(function () {
    prisma.videoGenerationJob.updateMany({
      where: { id: jobId, status: 'failed' },
      data: { status: 'queued', stage: 'queued', progress: 0, error: null },
    })
      .then(function (r) {
        if (r.count === 1) {
          return prisma.videoLesson.updateMany({
            where: { id: job.videoLessonId, status: 'failed' },
            data: { status: 'generating', errorMessage: null },
          });
        }
      })
      .catch(function (err) { log('requeue failed for', jobId, err.message); });
  }, delayMs);
}

async function recoverStaleJobs() {
  try {
    var cutoff = new Date(Date.now() - videoConfig.get().limits.staleJobMinutes * 60 * 1000);
    var stale = await prisma.videoGenerationJob.findMany({
      where: { status: 'processing', startedAt: { lt: cutoff } },
    });
    for (var i = 0; i < stale.length; i++) {
      var job = stale[i];
      log('recovering stale job', job.id);
      if (job.attempts >= job.maxAttempts) {
        await prisma.videoGenerationJob.update({
          where: { id: job.id },
          data: { status: 'failed', stage: 'failed', error: 'Job stalled and hit max attempts' },
        });
        await prisma.videoLesson.updateMany({
          where: { id: job.videoLessonId, status: 'generating' },
          data: { status: 'failed', errorMessage: 'Generation stalled and was stopped' },
        });
      } else {
        await prisma.videoGenerationJob.update({
          where: { id: job.id },
          data: { status: 'queued', stage: 'queued', progress: 0, startedAt: null },
        });
      }
    }
  } catch (err) {
    log('stale recovery error:', err.message);
  }
}

function start() {
  if (started) return;
  started = true;

  var cfg = videoConfig.get();
  if (!cfg.enabled) {
    log('VIDEO_GENERATION_ENABLED is not true — worker idle');
    return;
  }
  var readiness = cfg.isReady();
  if (!readiness.ready) {
    log('not configured, worker idle:', readiness.problems.join('; '));
    return;
  }

  log(`starting (concurrency ${cfg.limits.maxConcurrentJobs}, poll ${cfg.limits.pollIntervalMs}ms)`);

  var tick = async function () {
    try {
      // Claim repeatedly while there is queue headroom.
      while (await tryClaimJob()) { /* keep claiming */ }
    } catch (err) {
      log('poll error:', err.message);
    }
  };
  pollTimer = setInterval(tick, cfg.limits.pollIntervalMs);
  tick();

  staleTimer = setInterval(recoverStaleJobs, 5 * 60 * 1000);
  cleanupTimer = setInterval(function () {
    pipeline.cleanupExpiredAssets().catch(function (err) { log('cleanup error:', err.message); });
  }, 10 * 60 * 1000);
}

function stop() {
  if (pollTimer) clearInterval(pollTimer);
  if (staleTimer) clearInterval(staleTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  started = false;
}

module.exports = { start, stop };
