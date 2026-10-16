/**
 * Minimal OpenAI REST client (Node 18+ global fetch).
 * Covers the three calls the video pipeline needs: Responses API for the
 * lesson plan, Audio API for narration, Images API for scene visuals.
 */
var videoConfig = require('../../config/video');

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function request(path, body, expectBinary) {
  var cfg = videoConfig.openai;
  if (!cfg.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server');
  }
  var url = cfg.baseUrl + path;
  var attempt = 0;
  var lastError = null;

  while (attempt <= cfg.maxRetries) {
    attempt++;
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, cfg.requestTimeoutMs);
    try {
      var response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + cfg.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        if (expectBinary) {
          return Buffer.from(await response.arrayBuffer());
        }
        return await response.json();
      }

      var errorText = '';
      try { errorText = await response.text(); } catch (e) { /* ignore */ }
      var retryable = response.status === 429 || response.status >= 500;
      lastError = new Error('OpenAI request failed (' + response.status + '): ' + (errorText || 'no details').slice(0, 500));
      if (retryable && attempt <= cfg.maxRetries) {
        await sleep(attempt * 2000);
        continue;
      }
      throw lastError;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      var aborted = err && err.name === 'AbortError';
      if (aborted && attempt <= cfg.maxRetries) {
        await sleep(attempt * 2000);
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('OpenAI request failed');
}

/**
 * Calls the Responses API with a strict JSON schema and returns parsed JSON.
 */
async function generateStructuredJson(_cfg, schema, schemaName, inputMessages, useWebSearch) {
  var cfg = videoConfig.openai;
  var body = {
    model: cfg.planModel,
    input: inputMessages,
    text: {
      format: {
        type: 'json_schema',
        name: schemaName,
        schema: schema,
        strict: true,
      },
    },
    max_output_tokens: 16000,
  };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search' }];
  }
  var data = await request('/responses', body, false);
  var outputText = '';
  if (data && Array.isArray(data.output)) {
    for (var i = 0; i < data.output.length; i++) {
      var item = data.output[i];
      if (item.type === 'message' && Array.isArray(item.content)) {
        for (var j = 0; j < item.content.length; j++) {
          if (item.content[j].type === 'output_text' && item.content[j].text) {
            outputText += item.content[j].text;
          }
        }
      }
    }
  }
  if (!outputText && data && data.output_text) outputText = data.output_text;
  if (!outputText) {
    throw new Error('OpenAI returned an empty response');
  }
  var usage = data.usage || {};
  return {
    json: JSON.parse(outputText),
    usage: {
      inputTokens: usage.input_tokens || 0,
      outputTokens: usage.output_tokens || 0,
      model: data.model || cfg.planModel,
    },
  };
}

/**
 * Generates narration audio and returns an MP3 buffer.
 */
async function generateSpeech(text, language) {
  var cfg = videoConfig.openai;
  var instructions = language === 'rw'
    ? 'You are a warm, clear Rwandan teacher. Speak slowly and distinctly for students. Pronounce Kinyarwanda words carefully.'
    : 'You are a warm, clear teacher. Speak slowly and distinctly for students.';
  return request('/audio/speech', {
    model: cfg.ttsModel,
    input: text,
    voice: cfg.voice,
    response_format: 'mp3',
    instructions: instructions,
  }, true);
}

/**
 * Generates an educational illustration and returns a PNG buffer.
 */
async function generateImage(prompt) {
  var cfg = videoConfig.openai;
  var data = await request('/images/generations', {
    model: cfg.imageModel,
    prompt: prompt,
    size: cfg.imageSize,
    quality: 'medium',
  }, false);
  var b64 = data && data.data && data.data[0] && (data.data[0].b64_json || null);
  var imageUrl = data && data.data && data.data[0] && data.data[0].url;
  if (b64) return Buffer.from(b64, 'base64');
  if (imageUrl) {
    var response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to download generated image (' + response.status + ')');
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error('Image generation returned no image');
}

module.exports = {
  generateStructuredJson: generateStructuredJson,
  generateSpeech: generateSpeech,
  generateImage: generateImage,
};
