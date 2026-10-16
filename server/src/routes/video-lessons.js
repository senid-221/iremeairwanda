/**
 * Video lesson endpoints.
 *
 * Students request AI-generated video lessons, poll generation progress,
 * watch, track progress, take the knowledge-check quiz (scored server-side
 * — correct answers never leave the server before submission), and manage
 * their personal library.
 */
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth, requireActive } = require('../middleware/auth');
const videoConfig = require('../config/video');

const prisma = new PrismaClient();

const LANGUAGES = ['en', 'rw'];
const MAX_ACTIVE_JOBS_PER_USER = 3;

function estimateCost(durationMinutes, language) {
  // Rough pre-generation estimate for quota transparency; actuals vary.
  return durationMinutes * (language === 'rw' ? 0.12 : 0.09);
}

function buildDedupeKey(userId, body) {
  return crypto.createHash('sha1').update([
    userId,
    body.subjectId || '',
    body.educationLevelId || '',
    body.topicKey || body.topicName || '',
    body.language || 'en',
    body.durationMinutes || 5,
  ].join('|')).digest('hex');
}

function lessonSummary(lesson, progress) {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    topicName: lesson.topicName,
    language: lesson.language,
    durationMinutes: lesson.durationMinutes,
    durationSeconds: lesson.durationSeconds,
    status: lesson.status,
    stage: lesson.job ? lesson.job.stage : null,
    jobProgress: lesson.job ? lesson.job.progress : null,
    videoUrl: lesson.status === 'completed' ? lesson.videoUrl : null,
    captionUrl: lesson.status === 'completed' ? lesson.captionUrl : null,
    isAiGenerated: lesson.isAiGenerated,
    aiDisclosure: lesson.aiDisclosure,
    reviewStatus: lesson.reviewStatus,
    errorMessage: lesson.status === 'failed' ? lesson.errorMessage : null,
    createdAt: lesson.createdAt,
    progress: progress ? {
      lastPositionSeconds: progress.lastPositionSeconds,
      completionPercent: progress.completionPercent,
      completedAt: progress.completedAt,
      quizCompletedAt: progress.quizCompletedAt,
      quizScore: progress.quizScore,
      quizTotal: progress.quizTotal,
      savedToLibrary: progress.savedToLibrary,
    } : null,
  };
}

function requireCompleted(lesson, res) {
  if (lesson.status !== 'completed' || !lesson.videoUrl) {
    res.status(409).json({
      error: 'Video lesson is not ready',
      status: lesson.status,
      progress: lesson.job ? lesson.job.progress : null,
    });
    return false;
  }
  return true;
}

/**
 * POST /api/video-lessons — request a new video lesson.
 */
router.post('/', requireAuth, requireActive, async (req, res) => {
  try {
    var cfg = videoConfig.get();
    if (!cfg.enabled) {
      return res.status(503).json({ error: 'Video lesson generation is disabled on this server' });
    }
    var readiness = cfg.isReady();
    if (!readiness.ready) {
      return res.status(503).json({ error: 'Video generation is not configured', problems: readiness.problems });
    }

    var body = req.body || {};
    var language = LANGUAGES.indexOf(body.language) !== -1 ? body.language : 'en';
    var durationMinutes = parseInt(body.durationMinutes, 10);
    if (!Number.isFinite(durationMinutes) || durationMinutes < cfg.limits.minDurationMinutes || durationMinutes > cfg.limits.maxDurationMinutes) {
      return res.status(400).json({ error: `durationMinutes must be between ${cfg.limits.minDurationMinutes} and ${cfg.limits.maxDurationMinutes}` });
    }
    if (!body.topicName || String(body.topicName).trim().length < 2) {
      return res.status(400).json({ error: 'topicName is required' });
    }
    if (String(body.topicName).length > 200) {
      return res.status(400).json({ error: 'topicName is too long' });
    }

    var subject = null;
    if (body.subjectId) {
      subject = await prisma.subject.findFirst({ where: { id: String(body.subjectId), isActive: true } });
      if (!subject) return res.status(400).json({ error: 'Unknown subjectId' });
    }
    var level = null;
    if (body.educationLevelId) {
      level = await prisma.educationLevel.findFirst({ where: { id: String(body.educationLevelId), isActive: true } });
      if (!level) return res.status(400).json({ error: 'Unknown educationLevelId' });
    }

    // Default to the student's own enrolled level when available.
    if (!level && req.user.role === 'STUDENT') {
      var enrollment = await prisma.studentEnrollment.findFirst({
        where: { studentProfile: { userId: req.user.id }, status: { notIn: ['withdrawn', 'graduated'] } },
        orderBy: { createdAt: 'desc' },
        include: { educationLevel: true },
      });
      if (enrollment && enrollment.educationLevel) level = enrollment.educationLevel;
    }

    var dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    var [todayCount, activeCount] = await Promise.all([
      prisma.videoGenerationJob.count({ where: { userId: req.user.id, queuedAt: { gte: dayAgo } } }),
      prisma.videoGenerationJob.count({ where: { userId: req.user.id, status: { in: ['queued', 'processing'] } } }),
    ]);
    if (activeCount >= MAX_ACTIVE_JOBS_PER_USER) {
      return res.status(429).json({ error: 'You already have videos being generated. Please wait for them to finish.' });
    }
    if (todayCount >= cfg.limits.dailyQuotaPerUser) {
      return res.status(429).json({ error: `Daily generation limit reached (${cfg.limits.dailyQuotaPerUser} per day).` });
    }

    var dedupeKey = buildDedupeKey(req.user.id, body);
    var existing = await prisma.videoGenerationJob.findFirst({
      where: { userId: req.user.id, dedupeKey: dedupeKey, status: { in: ['queued', 'processing'] } },
      include: { videoLesson: true },
    });
    if (existing) {
      return res.status(200).json({
        duplicate: true,
        lessonId: existing.videoLessonId,
        jobId: existing.id,
        status: existing.status,
        stage: existing.stage,
        progress: existing.progress,
      });
    }

    var lesson = await prisma.videoLesson.create({
      data: {
        userId: req.user.id,
        subjectId: subject ? subject.id : null,
        educationLevelId: level ? level.id : null,
        topicKey: body.topicKey ? String(body.topicKey).slice(0, 120) : null,
        topicName: String(body.topicName).trim().slice(0, 200),
        language: language,
        durationMinutes: durationMinutes,
        status: 'generating',
      },
    });

    var job = await prisma.videoGenerationJob.create({
      data: {
        videoLessonId: lesson.id,
        userId: req.user.id,
        status: 'queued',
        stage: 'queued',
        progress: 0,
        dedupeKey: dedupeKey,
        provider: 'openai',
        costEstimate: estimateCost(durationMinutes, language),
      },
    });

    res.status(202).json({
      queued: true,
      lessonId: lesson.id,
      jobId: job.id,
      status: job.status,
      quota: { usedToday: todayCount + 1, dailyLimit: cfg.limits.dailyQuotaPerUser },
    });
  } catch (err) {
    console.error('video-lessons POST error:', err);
    res.status(500).json({ error: 'Could not queue video lesson' });
  }
});

/**
 * GET /api/video-lessons — the user's lessons (personal library + history).
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    var rows = await prisma.videoLesson.findMany({
      where: { userId: req.user.id, status: { notIn: ['cancelled'] } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { job: { select: { stage: true, progress: true } } },
    });
    var progressRows = await prisma.videoLessonProgress.findMany({
      where: { userId: req.user.id, videoLessonId: { in: rows.map(function (r) { return r.id; }) } },
    });
    var progressByLesson = {};
    progressRows.forEach(function (p) { progressByLesson[p.videoLessonId] = p; });
    res.json({
      lessons: rows.map(function (r) { return lessonSummary(r, progressByLesson[r.id]); }),
      quota: {
        usedToday: await prisma.videoGenerationJob.count({ where: { userId: req.user.id, queuedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        dailyLimit: videoConfig.get().limits.dailyQuotaPerUser,
      },
    });
  } catch (err) {
    console.error('video-lessons GET error:', err);
    res.status(500).json({ error: 'Could not load video lessons' });
  }
});

/**
 * GET /api/video-lessons/topics?subjectId=&educationLevelId= — curriculum
 * topics for the dropdown; falls back to custom-topic entry.
 */
router.get('/topics', requireAuth, async (req, res) => {
  try {
    var subjectId = String(req.query.subjectId || '');
    var levelId = String(req.query.educationLevelId || '');
    if (!subjectId || !levelId) {
      return res.json({ topics: [], allowCustom: true });
    }
    var levelSubjects = await prisma.levelSubject.findMany({
      where: { subjectId: subjectId, educationLevelId: levelId },
      include: {
        subjectTopics: {
          orderBy: { displayOrder: 'asc' },
          include: { curriculumTopic: { select: { code: true, name: true, nameEn: true, nameRw: true, description: true } } },
        },
      },
    });
    var seen = {};
    var topics = [];
    levelSubjects.forEach(function (ls) {
      ls.subjectTopics.forEach(function (st) {
        var t = st.curriculumTopic;
        if (!t || seen[t.code]) return;
        seen[t.code] = true;
        topics.push({ key: t.code, name: t.name, nameEn: t.nameEn, nameRw: t.nameRw, description: t.description });
      });
    });
    res.json({ topics: topics, allowCustom: true });
  } catch (err) {
    console.error('video-lessons topics error:', err);
    res.status(500).json({ error: 'Could not load topics' });
  }
});

/**
 * GET /api/video-lessons/jobs/:id — poll generation progress.
 */
router.get('/jobs/:id', requireAuth, async (req, res) => {
  try {
    var job = await prisma.videoGenerationJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { videoLesson: { select: { id: true, status: true, title: true } } },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({
      jobId: job.id,
      lessonId: job.videoLessonId,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      attempts: job.attempts,
      error: job.error,
      lessonStatus: job.videoLesson.status,
      title: job.videoLesson.title,
    });
  } catch (err) {
    console.error('video-lessons job GET error:', err);
    res.status(500).json({ error: 'Could not load job' });
  }
});

/**
 * POST /api/video-lessons/jobs/:id/cancel
 */
router.post('/jobs/:id/cancel', requireAuth, async (req, res) => {
  try {
    var job = await prisma.videoGenerationJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'queued' && job.status !== 'processing') {
      return res.status(409).json({ error: `Job is already ${job.status}` });
    }
    await prisma.videoGenerationJob.update({
      where: { id: job.id },
      data: { status: 'cancelled', stage: 'cancelled', completedAt: new Date() },
    });
    await prisma.videoLesson.update({
      where: { id: job.videoLessonId },
      data: { status: 'cancelled' },
    });
    res.json({ cancelled: true });
  } catch (err) {
    console.error('video-lessons cancel error:', err);
    res.status(500).json({ error: 'Could not cancel job' });
  }
});

/**
 * POST /api/video-lessons/jobs/:id/retry — requeue a failed job.
 */
router.post('/jobs/:id/retry', requireAuth, async (req, res) => {
  try {
    var job = await prisma.videoGenerationJob.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'failed') return res.status(409).json({ error: `Job is ${job.status}, only failed jobs can be retried` });
    if (job.attempts >= job.maxAttempts) {
      return res.status(429).json({ error: 'Maximum retry attempts reached. Please request a new video.' });
    }
    await prisma.$transaction([
      prisma.videoGenerationJob.update({
        where: { id: job.id },
        data: { status: 'queued', stage: 'queued', progress: 0, error: null, startedAt: null, completedAt: null },
      }),
      prisma.videoLesson.update({
        where: { id: job.videoLessonId },
        data: { status: 'generating', errorMessage: null },
      }),
    ]);
    res.json({ requeued: true });
  } catch (err) {
    console.error('video-lessons retry error:', err);
    res.status(500).json({ error: 'Could not retry job' });
  }
});

/**
 * GET /api/video-lessons/:id — full lesson for playback.
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    var lesson = await prisma.videoLesson.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        scenes: { orderBy: { sceneNumber: 'asc' } },
        assessments: { orderBy: { displayOrder: 'asc' } },
        job: { select: { stage: true, progress: true, id: true, status: true } },
      },
    });
    if (!lesson) return res.status(404).json({ error: 'Video lesson not found' });

    var progress = await prisma.videoLessonProgress.findUnique({
      where: { userId_videoLessonId: { userId: req.user.id, videoLessonId: lesson.id } },
    });

    var payload = lessonSummary(lesson, progress);
    payload.objectives = lesson.learningObjectives || [];
    payload.sourceUrls = lesson.sourceUrls || [];
    payload.curriculumRef = lesson.curriculumRef;
    payload.transcript = lesson.status === 'completed' ? lesson.transcript : null;
    payload.scenes = lesson.scenes.map(function (s) {
      return {
        sceneNumber: s.sceneNumber,
        title: s.title,
        startSeconds: s.startSeconds,
        durationSeconds: s.durationSeconds,
        captionText: s.captionText,
        imageUrl: s.imageUrl,
        visualType: s.visualType,
      };
    });
    if (lesson.status === 'completed') {
      payload.assessment = lesson.assessments.map(function (q) {
        return { id: q.id, questionText: q.questionText, options: q.questionOptions };
      });
    }

    res.json(payload);
  } catch (err) {
    console.error('video-lesson GET error:', err);
    res.status(500).json({ error: 'Could not load video lesson' });
  }
});

/**
 * POST /api/video-lessons/:id/progress — save watch position.
 */
router.post('/:id/progress', requireAuth, async (req, res) => {
  try {
    var lesson = await prisma.videoLesson.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true, durationSeconds: true, status: true },
    });
    if (!lesson) return res.status(404).json({ error: 'Video lesson not found' });
    if (lesson.status !== 'completed') return res.status(409).json({ error: 'Video lesson is not ready' });

    var last = Math.max(0, Number(req.body && req.body.lastPositionSeconds) || 0);
    var watched = Math.max(0, Number(req.body && req.body.watchedSeconds) || 0);
    var completionPercent = Math.max(0, Math.min(100, Number(req.body && req.body.completionPercent) || 0));
    var isComplete = completionPercent >= 95;

    var existing = await prisma.videoLessonProgress.findUnique({
      where: { userId_videoLessonId: { userId: req.user.id, videoLessonId: lesson.id } },
    });
    var data = {
      lastPositionSeconds: last,
      watchedSeconds: Math.max(watched, existing ? existing.watchedSeconds : 0),
      completionPercent: Math.max(completionPercent, existing ? existing.completionPercent : 0),
      completedAt: isComplete && !(existing && existing.completedAt) ? new Date() : (existing ? existing.completedAt : null),
    };
    var progress = existing
      ? await prisma.videoLessonProgress.update({ where: { id: existing.id }, data: data })
      : await prisma.videoLessonProgress.create({ data: Object.assign({ userId: req.user.id, videoLessonId: lesson.id }, data) });

    res.json({ saved: true, completionPercent: progress.completionPercent, completedAt: progress.completedAt });
  } catch (err) {
    console.error('video-lesson progress error:', err);
    res.status(500).json({ error: 'Could not save progress' });
  }
});

/**
 * POST /api/video-lessons/:id/quiz — score answers server-side and reveal
 * correct answers + explanations only after submission.
 */
router.post('/:id/quiz', requireAuth, async (req, res) => {
  try {
    var lesson = await prisma.videoLesson.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true, status: true, assessments: { orderBy: { displayOrder: 'asc' } } },
    });
    if (!lesson) return res.status(404).json({ error: 'Video lesson not found' });
    if (lesson.status !== 'completed') return res.status(409).json({ error: 'Video lesson is not ready' });
    if (!lesson.assessments.length) return res.status(404).json({ error: 'This lesson has no knowledge check' });

    var answers = Array.isArray(req.body && req.body.answers) ? req.body.answers : [];
    var results = lesson.assessments.map(function (q, i) {
      var answer = parseInt(answers[i], 10);
      var correct = answer === q.correctIndex;
      return { index: i, correct: correct, correctIndex: q.correctIndex, explanation: q.explanation };
    });
    var score = results.filter(function (r) { return r.correct; }).length;

    await prisma.videoLessonProgress.upsert({
      where: { userId_videoLessonId: { userId: req.user.id, videoLessonId: lesson.id } },
      update: { quizCompletedAt: new Date(), quizScore: score, quizTotal: lesson.assessments.length },
      create: {
        userId: req.user.id,
        videoLessonId: lesson.id,
        quizCompletedAt: new Date(),
        quizScore: score,
        quizTotal: lesson.assessments.length,
      },
    });

    res.json({ score: score, total: lesson.assessments.length, results: results });
  } catch (err) {
    console.error('video-lesson quiz error:', err);
    res.status(500).json({ error: 'Could not score quiz' });
  }
});

/**
 * POST /api/video-lessons/:id/library — toggle savedToLibrary.
 */
router.post('/:id/library', requireAuth, async (req, res) => {
  try {
    var lesson = await prisma.videoLesson.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      select: { id: true },
    });
    if (!lesson) return res.status(404).json({ error: 'Video lesson not found' });
    var existing = await prisma.videoLessonProgress.findUnique({
      where: { userId_videoLessonId: { userId: req.user.id, videoLessonId: lesson.id } },
    });
    var saved = existing ? !existing.savedToLibrary : true;
    var progress = existing
      ? await prisma.videoLessonProgress.update({ where: { id: existing.id }, data: { savedToLibrary: saved } })
      : await prisma.videoLessonProgress.create({ data: { userId: req.user.id, videoLessonId: lesson.id, savedToLibrary: saved } });
    res.json({ savedToLibrary: progress.savedToLibrary });
  } catch (err) {
    console.error('video-lesson library error:', err);
    res.status(500).json({ error: 'Could not update library' });
  }
});

module.exports = router;
