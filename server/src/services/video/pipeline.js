/**
 * Video lesson generation pipeline (orchestrator).
 *
 * Stages: plan (script) → narration (TTS) → visuals → render (FFmpeg) →
 * upload (object storage) → complete. Progress and stage are persisted on
 * the VideoGenerationJob row at every step, cancel requests are honored
 * between stages and between scenes, temp files are always cleaned up, and
 * a lesson is only marked completed after ffprobe validates a real MP4.
 */
var fs = require('fs');
var path = require('path');
var videoConfig = require('../../config/video');
var { PrismaClient } = require('@prisma/client');
var { generateSpeech } = require('./openai-client');
var { generateLessonScript } = require('./lesson-script');
var { generateSceneImage } = require('./visuals');
var renderer = require('./renderer');
var storage = require('./storage');

var prisma = new PrismaClient();

var SCENE_TAIL_PAD_SECONDS = 0.4;

function CancelledError() {
  var err = new Error('Generation cancelled by user');
  err.isCancellation = true;
  return err;
}

async function assertNotCancelled(jobId) {
  var job = await prisma.videoGenerationJob.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  if (!job || job.status === 'cancelled') throw CancelledError();
}

async function setProgress(jobId, stage, progress, backgroundJobId) {
  await prisma.videoGenerationJob.update({
    where: { id: jobId },
    data: { stage: stage, progress: progress },
  });
  if (backgroundJobId) {
    await prisma.backgroundJob.update({
      where: { id: backgroundJobId },
      data: { result: { stage: stage, progress: progress } },
    }).catch(function () {});
  }
}

function jobDirFor(jobId) {
  var cfg = videoConfig.get();
  var dir = path.join(cfg.renderer.workDir, jobId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanupDir(dir) {
  try {
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) { /* best-effort cleanup */ }
}

async function loadContext(lessonId) {
  var lesson = await prisma.videoLesson.findUnique({
    where: { id: lessonId },
    include: {
      user: { select: { id: true, fullName: true, preferredLanguage: true } },
      scenes: { orderBy: { sceneNumber: 'asc' } },
      assessments: { orderBy: { displayOrder: 'asc' } },
    },
  });
  if (!lesson) throw new Error(`VideoLesson ${lessonId} not found`);

  var subject = lesson.subjectId
    ? await prisma.subject.findUnique({ where: { id: lesson.subjectId } })
    : null;
  var level = lesson.educationLevelId
    ? await prisma.educationLevel.findUnique({ where: { id: lesson.educationLevelId } })
    : null;

  return {
    lesson: lesson,
    subject: subject,
    level: level,
    scriptContext: {
      subjectName: subject ? subject.name : null,
      subjectCode: subject ? subject.code : null,
      levelCode: level ? level.code : null,
      levelName: level ? level.name : null,
      topicName: lesson.topicName,
      language: lesson.language,
      durationMinutes: lesson.durationMinutes,
      studentName: lesson.user.fullName.split(' ')[0],
    },
  };
}

async function stageNarration(jobId, lessonId, scenes, dir, language, backgroundJobId) {
  var results = [];
  var cursor = 0;
  for (var i = 0; i < scenes.length; i++) {
    await assertNotCancelled(jobId);
    var scene = scenes[i];
    var audioBuffer = await generateSpeech(scene.narrationText, language);
    var audioPath = path.join(dir, `scene-${String(i + 1).padStart(2, '0')}.mp3`);
    fs.writeFileSync(audioPath, audioBuffer);
    var spoken = await renderer.probeMediaDuration(audioPath);
    var durationSeconds = spoken + SCENE_TAIL_PAD_SECONDS;
    results.push({
      sceneNumber: i + 1,
      title: scene.title,
      narration: scene.narrationText,
      caption: scene.captionText || scene.narrationText,
      visualDescription: scene.visualDescription,
      audioPath: audioPath,
      spokenSeconds: spoken,
      durationSeconds: durationSeconds,
      startSeconds: cursor,
    });
    cursor += durationSeconds;
    var pct = 30 + Math.round(((i + 1) / scenes.length) * 25);
    await setProgress(jobId, 'narration', pct, backgroundJobId);
  }
  return results;
}

async function stageVisuals(jobId, scenes, dir, scriptContext, backgroundJobId) {
  for (var i = 0; i < scenes.length; i++) {
    await assertNotCancelled(jobId);
    var scene = scenes[i];
    var image = await generateSceneImage(
      scene,
      { subjectName: scriptContext.subjectName, levelCode: scriptContext.levelCode, topicName: scriptContext.topicName, language: scriptContext.language },
      scene.sceneNumber,
      scenes.length
    );
    if (image.buffer) {
      var ext = image.contentType === 'image/jpeg' ? '.jpg' : '.png';
      scene.imagePath = path.join(dir, `scene-${String(scene.sceneNumber).padStart(2, '0')}${ext}`);
      fs.writeFileSync(scene.imagePath, image.buffer);
      scene.imageContentType = image.contentType;
    } else {
      scene.imagePath = null;
    }
    var pct = 55 + Math.round(((i + 1) / scenes.length) * 20);
    await setProgress(jobId, 'visuals', pct, backgroundJobId);
  }
  return scenes;
}

async function stageRender(jobId, scenes, dir, backgroundJobId) {
  var segments = [];
  for (var i = 0; i < scenes.length; i++) {
    await assertNotCancelled(jobId);
    var scene = scenes[i];
    var captionPlan = renderer.buildCaptionPlan(scene.caption, scene.durationSeconds);
    scene.captionPlan = captionPlan;
    var segmentPath = path.join(dir, `segment-${String(scene.sceneNumber).padStart(2, '0')}.mp4`);
    await renderer.renderSceneSegment({
      jobDir: dir,
      sceneNumber: scene.sceneNumber,
      imagePath: scene.imagePath,
      titleCard: scene.imagePath ? null : { title: scene.title, subtitle: '' },
      audioPath: scene.audioPath,
      captionPlan: captionPlan,
      duration: scene.durationSeconds,
      outputPath: segmentPath,
    });
    segments.push(segmentPath);
    var pct = 75 + Math.round(((i + 1) / scenes.length) * 12);
    await setProgress(jobId, 'render', pct, backgroundJobId);
  }

  await assertNotCancelled(jobId);
  var finalPath = path.join(dir, 'lesson-final.mp4');
  await renderer.concatSegments(segments, finalPath);
  await setProgress(jobId, 'render', 89, backgroundJobId);

  var validation = await renderer.validateVideo(finalPath);
  if (!validation.valid) {
    throw new Error('Rendered video failed validation: ' + validation.problems.join('; '));
  }
  return { finalPath: finalPath, validation: validation };
}

async function stageUpload(jobId, lessonId, language, scenes, rendered, dir, backgroundJobId) {
  await assertNotCancelled(jobId);
  var base = `video-lessons/${lessonId}`;
  var assets = [];

  var videoUpload = await storage.putFile(`${base}/lesson.mp4`, rendered.finalPath, 'video/mp4');
  assets.push({ assetType: 'video', storageKey: videoUpload.key, url: videoUpload.url, contentType: 'video/mp4', sizeBytes: rendered.validation.sizeBytes });

  var vttContent = renderer.buildVtt(scenes, `Language: ${language === 'rw' ? 'rw' : 'en'}`);
  var vttUpload = await storage.putObject(`${base}/captions.vtt`, Buffer.from(vttContent, 'utf8'), 'text/vtt');
  assets.push({ assetType: 'captions', storageKey: vttUpload.key, url: vttUpload.url, contentType: 'text/vtt', sizeBytes: Buffer.byteLength(vttContent) });

  var posterPath = path.join(dir, 'poster.jpg');
  try {
    await renderer.extractPoster(rendered.finalPath, posterPath);
    var posterUpload = await storage.putFile(`${base}/poster.jpg`, posterPath, 'image/jpeg');
    assets.push({ assetType: 'poster', storageKey: posterUpload.key, url: posterUpload.url, contentType: 'image/jpeg', sizeBytes: fs.statSync(posterPath).size });
  } catch (e) { /* poster is optional */ }

  for (var i = 0; i < scenes.length; i++) {
    var scene = scenes[i];
    if (scene.imagePath) {
      var contentType = scene.imageContentType || 'image/png';
      var ext = contentType === 'image/jpeg' ? 'jpg' : 'png';
      var upload = await storage.putFile(`${base}/scenes/scene-${String(scene.sceneNumber).padStart(2, '0')}.${ext}`, scene.imagePath, contentType);
      scene.imageUrl = upload.url;
      assets.push({ assetType: 'scene-image', storageKey: upload.key, url: upload.url, contentType: contentType, sizeBytes: fs.statSync(scene.imagePath).size });
    } else {
      scene.imageUrl = null;
    }
  }

  await setProgress(jobId, 'upload', 97, backgroundJobId);
  return { assets: assets, videoUrl: videoUpload.url, captionUrl: vttUpload.url };
}

async function persistResults(lessonId, ctx, scenes, rendered, uploaded) {
  var transcript = {
    generatedAt: new Date().toISOString(),
    language: ctx.lesson.language,
    isAiGenerated: true,
    scenes: scenes.map(function (s) {
      return {
        sceneNumber: s.sceneNumber,
        title: s.title,
        startSeconds: Math.round(s.startSeconds * 100) / 100,
        durationSeconds: Math.round(s.durationSeconds * 100) / 100,
        narration: s.narration,
        caption: s.caption,
        imageUrl: s.imageUrl || null,
      };
    }),
  };

  await prisma.$transaction([
    prisma.videoLessonScene.deleteMany({ where: { videoLessonId: lessonId } }),
    prisma.videoLessonScene.createMany({
      data: scenes.map(function (s) {
        return {
          videoLessonId: lessonId,
          sceneNumber: s.sceneNumber,
          title: s.title,
          narrationText: s.narration,
          captionText: s.caption,
          visualDescription: s.visualDescription,
          visualType: s.imagePath ? 'generated' : 'title-card',
          imageUrl: s.imageUrl,
          startSeconds: s.startSeconds,
          durationSeconds: s.durationSeconds,
        };
      }),
    }),
    prisma.videoLessonAsset.deleteMany({ where: { videoLessonId: lessonId } }),
    prisma.videoLessonAsset.createMany({
      data: uploaded.assets.map(function (a) {
        return {
          videoLessonId: lessonId,
          assetType: a.assetType,
          storageKey: a.storageKey,
          url: a.url,
          contentType: a.contentType,
          sizeBytes: a.sizeBytes,
          isTemporary: false,
        };
      }),
    }),
    prisma.videoLessonAssessment.deleteMany({ where: { videoLessonId: lessonId } }),
    prisma.videoLessonAssessment.createMany({
      data: (ctx.script && ctx.script.assessment ? ctx.script.assessment : []).map(function (q, i) {
        return {
          videoLessonId: lessonId,
          questionText: q.question,
          questionOptions: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          displayOrder: i + 1,
        };
      }),
    }),
    prisma.videoLesson.update({
      where: { id: lessonId },
      data: {
        title: ctx.script.title,
        description: ctx.script.description,
        learningObjectives: ctx.script.learningObjectives,
        status: 'completed',
        videoUrl: uploaded.videoUrl,
        captionUrl: uploaded.captionUrl,
        transcript: transcript,
        durationSeconds: Math.round(rendered.validation.duration),
        fileSizeBytes: rendered.validation.sizeBytes,
        resolution: `${rendered.validation.width}x${rendered.validation.height}`,
        modelUsed: ctx.usage ? ctx.usage.model : null,
        sourceUrls: ctx.script.sourceUrls || [],
        errorMessage: null,
      },
    }),
  ]);
}

async function notifyUser(lessonId, userId, title, language) {
  try {
    var isRw = language === 'rw';
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'video_lesson_ready',
        title: isRw ? 'Ikigamijwe cyawe cyiteguye' : 'Your video lesson is ready',
        message: isRw
          ? `"${title}" yateguwe kandi iri gupyumwa.`
          : `"${title}" has finished generating and is ready to watch.`,
        messageEn: `"${title}" has finished generating and is ready to watch.`,
        messageRw: `"${title}" yateguwe kandi iri gupyumwa.`,
        link: '/video-lessons.html',
        entityType: 'video_lesson',
        entityId: lessonId,
      },
    });
  } catch (e) { /* notification is best-effort */ }
}

/**
 * Process one queued job end to end. Throws on failure; the caller (worker)
 * decides retry policy. Cancellation is signaled with err.isCancellation.
 * When backgroundJobId is provided, the corresponding BackgroundJob row is
 * kept in sync so admins can monitor progress via /api/jobs.
 */
async function runJob(jobId, backgroundJobId) {
  var dir = null;
  var job = null;

  async function updateBg(data) {
    if (!backgroundJobId) return;
    await prisma.backgroundJob.update({
      where: { id: backgroundJobId },
      data: data,
    }).catch(function () {});
  }

  try {
    var cfg = videoConfig.get();
    var readiness = cfg.isReady();
    if (!readiness.ready) {
      throw new Error('Video generation is not configured: ' + readiness.problems.join('; '));
    }

    job = await prisma.videoGenerationJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'queued' && job.status !== 'processing') {
      return { skipped: true, status: job.status };
    }

    dir = jobDirFor(jobId);
    await prisma.videoGenerationJob.update({
      where: { id: jobId },
      data: { status: 'processing', stage: 'planning', progress: 5, startedAt: job.startedAt || new Date(), error: null },
    });
    await updateBg({ status: 'running', startedAt: new Date(), result: { stage: 'planning', progress: 5 } });

    var ctx = await loadContext(job.videoLessonId);
    await assertNotCancelled(jobId);

    // Stage 1: lesson script via Responses API (+ web search when enabled)
    await setProgress(jobId, 'planning', 10, backgroundJobId);
    var generated = await generateLessonScript(ctx.scriptContext);
    await assertNotCancelled(jobId);
    ctx.script = generated.script;
    ctx.usage = generated.usage;

    await prisma.videoLesson.update({
      where: { id: ctx.lesson.id },
      data: {
        title: generated.script.title,
        description: generated.script.description,
        learningObjectives: generated.script.learningObjectives,
        curriculumRef: generated.script.curriculumNotes || null,
        sourceUrls: generated.script.sourceUrls || [],
        modelUsed: generated.usage ? generated.usage.model : null,
      },
    });

    // Stage 2: narration audio per scene
    var scenes = await stageNarration(jobId, ctx.lesson.id, generated.script.scenes, dir, ctx.lesson.language, backgroundJobId);

    // Stage 3: visuals per scene
    await setProgress(jobId, 'visuals', 55, backgroundJobId);
    scenes = await stageVisuals(jobId, scenes, dir, ctx.scriptContext, backgroundJobId);

    // Stage 4: render + validate
    await setProgress(jobId, 'render', 75, backgroundJobId);
    var rendered = await stageRender(jobId, scenes, dir, backgroundJobId);

    // Stage 5: upload to object storage
    var uploaded = await stageUpload(jobId, ctx.lesson.id, ctx.lesson.language, scenes, rendered, dir, backgroundJobId);

    // Stage 6: persist everything and mark complete
    await persistResults(ctx.lesson.id, ctx, scenes, rendered, uploaded);
    await prisma.videoGenerationJob.update({
      where: { id: jobId },
      data: { status: 'completed', stage: 'complete', progress: 100, completedAt: new Date(), error: null },
    });
    await updateBg({ status: 'completed', completedAt: new Date(), result: { stage: 'complete', progress: 100, lessonId: ctx.lesson.id, durationSeconds: rendered.validation.duration } });
    await notifyUser(ctx.lesson.id, ctx.lesson.userId, ctx.script.title, ctx.lesson.language);

    cleanupDir(dir);
    return { ok: true, lessonId: ctx.lesson.id, durationSeconds: rendered.validation.duration };
  } catch (err) {
    cleanupDir(dir);
    if (err && err.isCancellation) {
      await prisma.videoLesson.updateMany({
        where: { id: job ? job.videoLessonId : '', status: { in: ['generating', 'queued'] } },
        data: { status: 'cancelled' },
      }).catch(function () {});
      await updateBg({ status: 'cancelled', completedAt: new Date() });
      throw err;
    }
    var message = String(err && err.message ? err.message : err).slice(0, 2000);
    await prisma.videoGenerationJob.updateMany({
      where: { id: jobId, status: { notIn: ['cancelled'] } },
      data: { status: 'failed', stage: 'failed', error: message },
    }).catch(function () {});
    await updateBg({ status: 'failed', error: message, completedAt: new Date() });
    if (job) {
      await prisma.videoLesson.updateMany({
        where: { id: job.videoLessonId, status: { notIn: ['cancelled'] } },
        data: { status: 'failed', errorMessage: message },
      }).catch(function () {});
      await notifyFailure(job.userId, message);
    }
    throw err;
  }
}

async function notifyFailure(userId, message) {
  try {
    await prisma.notification.create({
      data: {
        userId: userId,
        type: 'video_lesson_failed',
        title: 'Video lesson generation failed',
        message: 'We could not finish generating your video lesson. You can retry from your library.',
        messageEn: 'We could not finish generating your video lesson. You can retry from your library.',
        messageRw: 'Ntibyakunze gutegura ikigamijwe cyawe. Ongera ugerageze.',
        link: '/video-lessons.html',
        entityType: 'video_lesson',
        priority: 'high',
      },
    });
  } catch (e) { /* best-effort */ }
}

/**
 * Delete expired temporary assets (e.g. staged files) and local storage
 * orphans. Called periodically by the worker.
 */
async function cleanupExpiredAssets() {
  var expired = await prisma.videoLessonAsset.findMany({
    where: { isTemporary: true, expiresAt: { lt: new Date() } },
  });
  var removed = 0;
  for (var i = 0; i < expired.length; i++) {
    try {
      var cfg = videoConfig.get();
      if (storage.getStorageMode() === 'local') {
        var full = path.join(cfg.storage.local.dir, expired[i].storageKey.replace(/\.\./g, ''));
        fs.rmSync(full, { force: true });
      }
      await prisma.videoLessonAsset.delete({ where: { id: expired[i].id } });
      removed++;
    } catch (e) { /* keep going */ }
  }
  return removed;
}

module.exports = { runJob, cleanupExpiredAssets, CancelledError };
