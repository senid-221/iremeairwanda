/**
 * Lesson plan generation and validation.
 * Produces a structured, scene-by-scene script via the Responses API with a
 * strict JSON schema, then validates it before anything is rendered.
 */
var videoConfig = require('../../config/video');
var openai = require('./openai-client');

var LESSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'description', 'learningObjectives', 'scenes', 'assessment'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    learningObjectives: {
      type: 'array',
      items: { type: 'string' },
    },
    curriculumNotes: { type: 'string' },
    sourceUrls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url'],
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'narration', 'caption', 'visualDescription'],
        properties: {
          title: { type: 'string' },
          narration: { type: 'string' },
          caption: { type: 'string' },
          visualDescription: { type: 'string' },
        },
      },
    },
    assessment: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['question', 'options', 'correctIndex', 'explanation'],
        properties: {
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          correctIndex: { type: 'integer' },
          explanation: { type: 'string' },
        },
      },
    },
  },
};

function levelGuidance(levelCode) {
  var code = String(levelCode || '').toUpperCase();
  if (/^P[1-3]$/.test(code)) {
    return 'Learner is 6-9 years old. Use very short sentences, concrete everyday examples (home, market, animals), and one idea per scene.';
  }
  if (/^P[4-6]$/.test(code)) {
    return 'Learner is 9-12 years old. Use simple sentences, familiar Rwandan examples, and build from concrete to slightly abstract.';
  }
  if (/^S[1-3]$/.test(code)) {
    return 'Learner is 13-15 years old in ordinary level. Use clear structured explanations with worked examples.';
  }
  if (/^S[4-6]$/.test(code)) {
    return 'Learner is 16-18 years old in advanced level. Use precise terminology and multi-step worked examples.';
  }
  if (code === 'TTC') return 'Learner is a student teacher. Connect theory to classroom practice examples.';
  if (code === 'TVET') return 'Learner is in technical/vocational training. Emphasize practical, hands-on applications and trades terminology.';
  return 'Adapt vocabulary to a general secondary school learner.';
}

function buildInputMessages(ctx) {
  var languageName = ctx.language === 'rw' ? 'Kinyarwanda' : 'English';
  var durationText = ctx.durationMinutes <= 2
    ? 'a quick explanation'
    : ctx.durationMinutes <= 5
      ? 'a standard short lesson'
      : 'a detailed revision lesson';

  var system = [
    'You are IREME AI, a careful Rwandan curriculum teacher that produces short educational video lessons.',
    'Always align content with the official Rwanda curriculum (REB, NESA, MINEDUC) for the level given.',
    'Never invent official textbook titles, exam requirements, or institutional endorsements.',
    'If you use web search, only cite official or well-established educational sources.',
    'Write every scene narration and caption in ' + languageName + '.',
    'Captions must be short (max 12 words) and readable at a glance.',
    'Each scene narration should take roughly 25-45 seconds to speak at a calm teaching pace.',
    'Visual descriptions must describe a single uncluttered educational illustration or diagram WITHOUT any text inside the image (text is added separately).',
    'The assessment must contain 3-5 multiple-choice questions with exactly 4 options each and a short explanation for the correct answer.',
    'Disclose nothing about being official curriculum; the lesson is a study aid aligned to the curriculum.',
  ].join(' ');

  var userParts = [
    'Create ' + durationText + ' (' + ctx.durationMinutes + ' minute(s) of narration) about:',
    'Subject: ' + (ctx.subjectName || 'General studies'),
    'Education level: ' + (ctx.levelCode || 'General') + (ctx.levelName ? ' (' + ctx.levelName + ')' : ''),
    'Topic: ' + ctx.topicName,
  ];
  if (ctx.curriculumRef) userParts.push('Curriculum unit reference: ' + ctx.curriculumRef);
  if (ctx.learningGaps && ctx.learningGaps.length) {
    userParts.push('The learner has struggled with these recent areas (weave gentle revision of them in): ' + ctx.learningGaps.join('; '));
  }
  userParts.push('Audience guidance: ' + levelGuidance(ctx.levelCode));
  userParts.push('Total scene count: between ' + ctx.minScenes + ' and ' + ctx.maxScenes + ' scenes.');
  userParts.push('Include: an introduction with learning objective, step-by-step explanation, at least one worked example, a summary, and a final knowledge-check scene.');

  return [
    { role: 'system', content: system },
    { role: 'user', content: userParts.join('\n') },
  ];
}

function cleanText(value, maxLen) {
  var text = String(value || '').replace(/\s+/g, ' ').trim();
  if (maxLen && text.length > maxLen) return text.slice(0, maxLen - 1).trim() + '…';
  return text;
}

/**
 * Validates the model output shape; throws with a precise message otherwise.
 */
function validateLessonScript(script, limits) {
  if (!script || typeof script !== 'object') throw new Error('Lesson script is not an object');
  if (!script.title || !String(script.title).trim()) throw new Error('Lesson script has no title');
  if (!Array.isArray(script.scenes) || script.scenes.length < limits.minScenes) {
    throw new Error('Lesson script has too few scenes (minimum ' + limits.minScenes + ')');
  }
  if (script.scenes.length > limits.maxScenes) {
    throw new Error('Lesson script has too many scenes (maximum ' + limits.maxScenes + ')');
  }
  for (var i = 0; i < script.scenes.length; i++) {
    var scene = script.scenes[i];
    if (!scene || !String(scene.narration || '').trim()) {
      throw new Error('Scene ' + (i + 1) + ' has no narration text');
    }
    if (!String(scene.caption || '').trim()) {
      throw new Error('Scene ' + (i + 1) + ' has no caption text');
    }
    if (!String(scene.visualDescription || '').trim()) {
      throw new Error('Scene ' + (i + 1) + ' has no visual description');
    }
  }
  if (!Array.isArray(script.assessment) || script.assessment.length < 2) {
    throw new Error('Lesson script needs at least 2 assessment questions');
  }
  if (script.assessment.length > 6) {
    throw new Error('Lesson script has too many assessment questions (maximum 6)');
  }
  for (var q = 0; q < script.assessment.length; q++) {
    var question = script.assessment[q];
    if (!question || !String(question.question || '').trim()) {
      throw new Error('Assessment question ' + (q + 1) + ' has no text');
    }
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new Error('Assessment question ' + (q + 1) + ' must have exactly 4 options');
    }
    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error('Assessment question ' + (q + 1) + ' has an invalid correctIndex');
    }
    if (!String(question.explanation || '').trim()) {
      throw new Error('Assessment question ' + (q + 1) + ' has no explanation');
    }
  }

  return {
    title: cleanText(script.title, 160),
    description: cleanText(script.description, 500),
    learningObjectives: (script.learningObjectives || []).slice(0, 6).map(function (o) { return cleanText(o, 200); }),
    curriculumNotes: cleanText(script.curriculumNotes || '', 500),
    sourceUrls: (script.sourceUrls || []).slice(0, 6).map(function (s) {
      return { title: cleanText(s.title, 160), url: String(s.url || '').slice(0, 500) };
    }).filter(function (s) { return /^https?:\/\//.test(s.url); }),
    scenes: script.scenes.map(function (scene, index) {
      return {
        sceneNumber: index + 1,
        title: cleanText(scene.title, 120),
        narrationText: cleanText(scene.narration, 1200),
        captionText: cleanText(scene.caption, 120),
        visualDescription: cleanText(scene.visualDescription, 500),
      };
    }),
    assessment: script.assessment.map(function (question, index) {
      return {
        questionText: cleanText(question.question, 400),
        questionOptions: question.options.map(function (o) { return cleanText(o, 160); }),
        correctIndex: question.correctIndex,
        explanation: cleanText(question.explanation, 500),
        displayOrder: index + 1,
      };
    }),
  };
}

/**
 * Generates and validates a complete lesson script.
 */
async function generateLessonScript(ctx) {
  var limits = videoConfig.limits;
  var needsWebSearch = !!ctx.allowWebSearch;
  var result = await openai.generateStructuredJson(
    videoConfig.openai,
    LESSON_SCHEMA,
    'ireme_lesson_plan',
    buildInputMessages(ctx),
    needsWebSearch
  );
  var validated = validateLessonScript(result.json, limits);
  return {
    script: validated,
    usage: result.usage,
  };
}

module.exports = {
  generateLessonScript: generateLessonScript,
  validateLessonScript: validateLessonScript,
  buildInputMessages: buildInputMessages,
};
