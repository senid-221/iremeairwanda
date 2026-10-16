var { generateImage } = require('./openai-client');
var videoConfig = require('../../config/video');

function isPng(buffer) {
  return buffer && buffer.length > 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
}

function isJpeg(buffer) {
  return buffer && buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

async function generateSceneImage(scene, lessonContext, sceneNumber, totalScenes) {
  var cfg = videoConfig.get();

  if (!cfg.openai.apiKey) {
    return { buffer: null, kind: 'title-card', reason: 'no-image-model-configured' };
  }

  var prompt = [
    `Educational illustration for a school video lesson, clean flat vector style, friendly and clear.`,
    `Subject: ${lessonContext.subjectName || 'general studies'}.`,
    `Education level: ${lessonContext.levelCode || 'general'}.`,
    `Scene ${sceneNumber} of ${totalScenes}: ${scene.title}.`,
    `Visual concept: ${scene.visualDescription}`,
    'No text, no letters, no words, no numbers in the image.',
    'No brand logos, no watermarks, no photographs of identifiable real people.',
    lessonContext.language === 'rw'
      ? 'Rwandan context where natural (students, classrooms, landscapes, markets, agriculture).'
      : 'Clear classroom-appropriate illustration.',
  ].join(' ');

  try {
    var buffer = await generateImage(prompt);
    if (isPng(buffer) || isJpeg(buffer)) {
      return { buffer, kind: 'generated', reason: null };
    }
    return { buffer: null, kind: 'title-card', reason: 'image-response-not-a-valid-image' };
  } catch (err) {
    return { buffer: null, kind: 'title-card', reason: `image-generation-failed: ${err.message}` };
  }
}

module.exports = { generateSceneImage };
