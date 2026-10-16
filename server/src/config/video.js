/**
 * Video lesson generation configuration.
 * All values come from environment variables so nothing is hardcoded;
 * the pipeline refuses to run when required pieces are missing.
 */
var path = require('path');
var fs = require('fs');

function bool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function int(value, fallback) {
  var parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function detectFontPath() {
  if (process.env.FFMPEG_FONT_PATH) return process.env.FFMPEG_FONT_PATH;
  var candidates = process.platform === 'win32'
    ? [
        'C:\\Windows\\Fonts\\arial.ttf',
        'C:\\Windows\\Fonts\\calibri.ttf',
        'C:\\Windows\\Fonts\\segoeui.ttf',
      ]
    : [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
        '/usr/share/fonts/TTF/DejaVuSans.ttf',
      ];
  for (var i = 0; i < candidates.length; i++) {
    try {
      if (fs.existsSync(candidates[i])) return candidates[i];
    } catch (e) { /* ignore */ }
  }
  return null;
}

var storageMode = (process.env.VIDEO_STORAGE_MODE || (process.env.OBJECT_STORAGE_BUCKET ? 's3' : 'local')).toLowerCase();

var config = {
  enabled: bool(process.env.VIDEO_GENERATION_ENABLED, false),

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    planModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    imageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    voice: process.env.OPENAI_TTS_VOICE || 'alloy',
    imageSize: process.env.OPENAI_IMAGE_SIZE || '1536x1024',
    requestTimeoutMs: int(process.env.OPENAI_TIMEOUT_MS, 120000),
    maxRetries: int(process.env.OPENAI_MAX_RETRIES, 2),
  },

  renderer: {
    type: process.env.VIDEO_RENDERER || 'ffmpeg',
    ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
    ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
    fontPath: detectFontPath(),
    width: int(process.env.VIDEO_WIDTH, 1280),
    height: int(process.env.VIDEO_HEIGHT, 720),
    workDir: process.env.VIDEO_WORK_DIR || path.join(require('os').tmpdir(), 'ireme-video-jobs'),
  },

  storage: {
    mode: storageMode === 's3' ? 's3' : 'local',
    s3: {
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT || '',
      region: process.env.OBJECT_STORAGE_REGION || 'auto',
      bucket: process.env.OBJECT_STORAGE_BUCKET || '',
      accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY || '',
      secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY || '',
      publicBaseUrl: (process.env.OBJECT_STORAGE_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
    },
    local: {
      dir: process.env.VIDEO_LOCAL_STORAGE_DIR || path.join(require('os').tmpdir(), 'ireme-video-storage'),
      urlPrefix: '/media/videos',
    },
  },

  limits: {
    maxConcurrentJobs: int(process.env.VIDEO_MAX_CONCURRENT_JOBS, 2),
    dailyQuotaPerUser: int(process.env.VIDEO_DAILY_QUOTA_PER_USER, 10),
    minDurationMinutes: 1,
    maxDurationMinutes: int(process.env.VIDEO_MAX_DURATION_MINUTES, 8),
    minScenes: 3,
    maxScenes: 14,
    staleJobMinutes: int(process.env.VIDEO_STALE_JOB_MINUTES, 30),
    pollIntervalMs: int(process.env.VIDEO_WORKER_POLL_MS, 10000),
  },
};

config.get = function () { return config; };

config.isReady = function () {
  var problems = [];
  if (!this.openai.apiKey) problems.push('OPENAI_API_KEY is not set');
  if (!this.renderer.fontPath) problems.push('No subtitle font found (set FFMPEG_FONT_PATH)');
  if (this.storage.mode === 's3' && (!this.storage.s3.bucket || !this.storage.s3.accessKeyId || !this.storage.s3.secretAccessKey)) {
    problems.push('Object storage is not fully configured (OBJECT_STORAGE_BUCKET, OBJECT_STORAGE_ACCESS_KEY, OBJECT_STORAGE_SECRET_KEY)');
  }
  return { ready: problems.length === 0, problems: problems };
};

module.exports = config;
