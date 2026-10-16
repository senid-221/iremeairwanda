/**
 * FFmpeg-based video renderer.
 *
 * Produces one MP4 segment per scene (image or solid-color title card +
 * TTS narration audio + burned-in caption chunks), concatenates the
 * segments, validates the result with ffprobe, and builds a WebVTT track
 * whose cue timings match the burned-in captions.
 *
 * Caption text is passed to drawtext via textfile= so no shell/filter
 * escaping of lesson content is needed.
 */
var fs = require('fs');
var path = require('path');
var os = require('os');
var { execFile } = require('child_process');
var videoConfig = require('../../config/video');

var SEGMENT_TIMEOUT_MS = 10 * 60 * 1000;
var PROBE_TIMEOUT_MS = 30 * 1000;

function run(cmd, args, timeoutMs) {
  return new Promise(function (resolve, reject) {
    execFile(cmd, args, { timeout: timeoutMs || PROBE_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, function (err, stdout, stderr) {
      if (err) {
        var tail = String(stderr || '').split('\n').slice(-8).join('\n').trim();
        reject(new Error(`${path.basename(cmd)} failed: ${tail || err.message}`));
        return;
      }
      resolve({ stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function ensureFfmpeg() {
  var cfg = videoConfig.get();
  if (cfg.renderer.type !== 'ffmpeg') {
    throw new Error(`Unsupported VIDEO_RENDERER "${cfg.renderer.type}" — only ffmpeg is implemented`);
  }
  if (!cfg.renderer.fontPath) {
    throw new Error('No caption font found (set FFMPEG_FONT_PATH)');
  }
}

function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

function quoteFilterValue(value) {
  // Option-value (level-1) escaping inside filtergraph-level quotes:
  // \ -> \\, : -> \:, ' -> \'. The surrounding single quotes handle the
  // level-2 filtergraph specials (, [ ] ;).
  var escaped = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function fontFilterArg() {
  var cfg = videoConfig.get();
  return `fontfile=${quoteFilterValue(toPosix(cfg.renderer.fontPath))}`;
}

function drawText(textFile, opts) {
  var parts = [fontFilterArg()];
  parts.push(`textfile=${quoteFilterValue(toPosix(textFile))}`);
  if (opts.fontSize) parts.push(`fontsize=${opts.fontSize}`);
  parts.push(`fontcolor=${opts.color || 'white'}`);
  parts.push(`x=(w-text_w)/2`);
  parts.push(`y=${opts.y}`);
  if (opts.box) {
    parts.push('box=1');
    parts.push('boxcolor=black@0.45');
    parts.push('boxborderw=14');
  }
  parts.push(`enable=${quoteFilterValue(`between(t,${opts.start.toFixed(2)},${opts.end.toFixed(2)})`)}`);
  return `drawtext=${parts.join(':')}`;
}

function splitCaptionChunks(text, maxChars) {
  var clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  var sentences = clean.match(/[^.!?…]+[.!?…]*\s*/g) || [clean];
  var chunks = [];
  var current = '';
  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i].trim();
    if (!s) continue;
    if (s.length > maxChars) {
      if (current) { chunks.push(current); current = ''; }
      var words = s.split(' ');
      var line = '';
      for (var w = 0; w < words.length; w++) {
        if ((line + ' ' + words[w]).trim().length > maxChars) {
          if (line) chunks.push(line.trim());
          line = words[w];
        } else {
          line = (line + ' ' + words[w]).trim();
        }
      }
      if (line) chunks.push(line.trim());
      continue;
    }
    if ((current + ' ' + s).trim().length > maxChars) {
      if (current) chunks.push(current);
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Allocate caption chunk timings proportionally across the scene duration,
 * mirroring how narration length maps to speech time.
 */
function buildCaptionPlan(captionSource, sceneDuration, maxChars) {
  var chunks = splitCaptionChunks(captionSource, maxChars || 90);
  if (!chunks.length || sceneDuration <= 0) return [];
  var totalLen = chunks.reduce(function (sum, c) { return sum + c.length; }, 0);
  var cursor = 0;
  return chunks.map(function (text) {
    var share = (text.length / totalLen) * sceneDuration;
    var start = cursor;
    var end = Math.min(cursor + share, sceneDuration);
    cursor = end;
    return { text: text, start: start, end: Math.max(end, start + 0.4) };
  });
}

function writeCaptionFiles(jobDir, sceneNumber, plan) {
  return plan.map(function (chunk, i) {
    var file = path.join(jobDir, `cap-${String(sceneNumber).padStart(2, '0')}-${i}.txt`);
    fs.writeFileSync(file, chunk.text, 'utf8');
    return { file: file, start: chunk.start, end: chunk.end };
  });
}

function writeTitleCardFiles(jobDir, sceneNumber, title, subtitle) {
  var wrap = function (s, width) {
    var words = String(s || '').split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    for (var i = 0; i < words.length; i++) {
      if ((line + ' ' + words[i]).trim().length > width) {
        if (line) lines.push(line.trim());
        line = words[i];
      } else {
        line = (line + ' ' + words[i]).trim();
      }
    }
    if (line) lines.push(line.trim());
    return lines.slice(0, 5).join('\n');
  };
  var titleFile = path.join(jobDir, `tc-title-${String(sceneNumber).padStart(2, '0')}.txt`);
  var subFile = path.join(jobDir, `tc-sub-${String(sceneNumber).padStart(2, '0')}.txt`);
  fs.writeFileSync(titleFile, wrap(title, 30) || ' ', 'utf8');
  fs.writeFileSync(subFile, wrap(subtitle, 46) || ' ', 'utf8');
  return { titleFile: titleFile, subFile: subFile };
}

function titleCardBackground(sceneNumber) {
  // First scene (lesson cover) gets the brand gradient stand-in; later
  // title cards use a calmer variant so scenes remain distinguishable.
  return sceneNumber === 1 ? '0x1E3A8A' : '0x312E81';
}

/**
 * Render one scene into an H.264/AAC MP4 segment.
 * Either imagePath (generated illustration) or titleCard {title, subtitle}
 * must be provided.
 */
async function renderSceneSegment(options) {
  ensureFfmpeg();
  var cfg = videoConfig.get();
  var w = cfg.renderer.width;
  var h = cfg.renderer.height;
  var args = ['-y', '-hide_banner', '-loglevel', 'error'];

  var filterParts = [];
  var captionFiles = writeCaptionFiles(options.jobDir, options.sceneNumber, options.captionPlan || []);

  if (options.imagePath) {
    args.push('-loop', '1', '-framerate', '25', '-i', options.imagePath);
    args.push('-i', options.audioPath);
    filterParts.push(
      `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2,setsar=1`
    );
    for (var i = 0; i < captionFiles.length; i++) {
      filterParts[0] += ',' + drawText(captionFiles[i].file, { fontSize: 34, color: 'white', box: true, y: `h-${(h * 0.14).toFixed(1)}`, start: captionFiles[i].start, end: captionFiles[i].end });
    }
  } else if (options.titleCard) {
    var tc = writeTitleCardFiles(options.jobDir, options.sceneNumber, options.titleCard.title, options.titleCard.subtitle || '');
    args.push('-f', 'lavfi', '-i', `color=c=${titleCardBackground(options.sceneNumber)}:s=${w}x${h}:r=25`);
    args.push('-i', options.audioPath);
    filterParts.push(
      `[0:v]${drawText(tc.titleFile, { fontSize: 58, color: 'white', y: `(h-text_h)/2-${(h * 0.06).toFixed(1)}`, start: 0, end: options.duration + 1 })}` +
      `,${drawText(tc.subFile, { fontSize: 30, color: '0xE2E8F0', y: `(h-text_h)/2+${(h * 0.12).toFixed(1)}`, start: 0, end: options.duration + 1 })}` +
      (captionFiles.length ? `,${drawText(captionFiles[0].file, { fontSize: 34, color: 'white', box: true, y: `h-${(h * 0.14).toFixed(1)}`, start: captionFiles[0].start, end: captionFiles[0].end })}` : '')
    );
  } else {
    throw new Error('Scene has neither an image nor title-card text');
  }

  filterParts[0] += `[v]`;
  args.push('-filter_complex', filterParts[0]);
  args.push('-map', '[v]', '-map', '1:a');
  args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p');
  args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2');
  args.push('-t', options.duration.toFixed(3));
  args.push(options.outputPath);

  await run(cfg.renderer.ffmpegPath, args, SEGMENT_TIMEOUT_MS);
  return options.outputPath;
}

/**
 * Concatenate scene segments with the concat demuxer (stream copy —
 * every segment is encoded with identical parameters, so this is safe).
 */
async function concatSegments(segmentPaths, outputPath) {
  ensureFfmpeg();
  var cfg = videoConfig.get();
  var listPath = outputPath.replace(/\.mp4$/, '-list.txt');
  var listContent = segmentPaths.map(function (p) {
    return `file '${toPosix(p).replace(/'/g, "\\'")}'`;
  }).join('\n') + '\n';
  fs.writeFileSync(listPath, listContent, 'utf8');

  await run(cfg.renderer.ffmpegPath, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'concat', '-safe', '0', '-i', listPath,
    '-c', 'copy', '-movflags', '+faststart',
    outputPath,
  ], SEGMENT_TIMEOUT_MS);
  return outputPath;
}

async function extractPoster(videoPath, posterPath) {
  ensureFfmpeg();
  var cfg = videoConfig.get();
  await run(cfg.renderer.ffmpegPath, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-ss', '1', '-i', videoPath, '-frames:v', '1', '-q:v', '3',
    posterPath,
  ], 60 * 1000);
  return posterPath;
}

async function probeMediaDuration(filePath) {
  ensureFfmpeg();
  var cfg = videoConfig.get();
  var res = await run(cfg.renderer.ffprobePath, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath,
  ]);
  var parsed = JSON.parse(res.stdout || '{}');
  var duration = parseFloat(parsed.format && parsed.format.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`ffprobe could not determine duration of ${path.basename(filePath)}`);
  }
  return duration;
}

async function validateVideo(videoPath) {
  ensureFfmpeg();
  var cfg = videoConfig.get();
  var res = await run(cfg.renderer.ffprobePath, [
    '-v', 'error',
    '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=codec_type,codec_name,width,height',
    '-of', 'json', videoPath,
  ]);
  var parsed = JSON.parse(res.stdout || '{}');
  var streams = parsed.streams || [];
  var video = streams.find(function (s) { return s.codec_type === 'video'; });
  var audio = streams.find(function (s) { return s.codec_type === 'audio'; });
  var duration = parseFloat(parsed.format && parsed.format.duration);
  var problems = [];
  if (!video) problems.push('no video stream in rendered file');
  if (!audio) problems.push('no audio stream in rendered file');
  if (video && video.codec_name !== 'h264') problems.push(`unexpected video codec ${video.codec_name}`);
  if (audio && audio.codec_name !== 'aac') problems.push(`unexpected audio codec ${audio.codec_name}`);
  if (!Number.isFinite(duration) || duration < 1) problems.push('rendered duration is missing or too short');
  return {
    valid: problems.length === 0,
    duration: Number.isFinite(duration) ? duration : null,
    sizeBytes: parseInt(parsed.format && parsed.format.size, 10) || null,
    width: video ? video.width : null,
    height: video ? video.height : null,
    problems: problems,
  };
}

function vttTimestamp(seconds) {
  var s = Math.max(0, seconds);
  var h = Math.floor(s / 3600);
  var m = Math.floor((s % 3600) / 60);
  var sec = Math.floor(s % 60);
  var ms = Math.round((s - Math.floor(s)) * 1000);
  var pad = function (n, len) { return String(n).padStart(len || 2, '0'); };
  return `${pad(h)}:${pad(m)}:${pad(sec)}.${pad(ms, 3)}`;
}

/**
 * Build a WebVTT track from per-scene caption plans.
 * scenes: [{ startSeconds, durationSeconds, captionPlan: [{text,start,end}] }]
 */
function buildVtt(scenes, header) {
  var lines = ['WEBVTT', ''];
  if (header) { lines.push(header, ''); }
  var cueIndex = 1;
  for (var i = 0; i < scenes.length; i++) {
    var scene = scenes[i];
    var plan = scene.captionPlan || [];
    for (var j = 0; j < plan.length; j++) {
      var chunk = plan[j];
      var start = scene.startSeconds + chunk.start;
      var end = scene.startSeconds + Math.min(chunk.end, scene.durationSeconds);
      if (end <= start) end = start + 0.4;
      lines.push(String(cueIndex++));
      lines.push(`${vttTimestamp(start)} --> ${vttTimestamp(end)}`);
      lines.push(chunk.text);
      lines.push('');
    }
  }
  return lines.join('\n');
}

module.exports = {
  buildCaptionPlan: buildCaptionPlan,
  renderSceneSegment: renderSceneSegment,
  concatSegments: concatSegments,
  extractPoster: extractPoster,
  probeMediaDuration: probeMediaDuration,
  validateVideo: validateVideo,
  buildVtt: buildVtt,
  splitCaptionChunks: splitCaptionChunks,
  vttTimestamp: vttTimestamp,
};
