const axios = require('axios');
const env = require('../../config/env');
const ApiError = require('../../utils/apiError');

const parseResponse = (data, maxTokens) => {
  if (!data) return null;

  // Groq: output (string) or output array
  if (typeof data.output === 'string' && data.output.trim()) return data.output.trim();
  if (Array.isArray(data.output) && data.output.length > 0) {
    const first = data.output[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (first && typeof first.content === 'string' && first.content.trim()) return first.content.trim();
  }

  // Groq: generations
  if (data.generations && Array.isArray(data.generations) && data.generations[0]) {
    const gen = data.generations[0];
    if (typeof gen.text === 'string' && gen.text.trim()) return gen.text.trim();
    if (Array.isArray(gen.output_text)) return gen.output_text.join('\n').trim();
  }

  // OpenAI-compatible: choices -> message.content or text
  if (data.choices && Array.isArray(data.choices) && data.choices[0]) {
    const c = data.choices[0];
    if (c.message && typeof c.message.content === 'string' && c.message.content.trim()) return c.message.content.trim();
    if (typeof c.text === 'string' && c.text.trim()) return c.text.trim();
  }

  // Fallback stringify (truncate)
  try {
    const s = JSON.stringify(data);
    return typeof s === 'string' ? s.substring(0, maxTokens || 2000) : null;
  } catch (_) {
    return null;
  }
};

const generate = async ({ prompt, maxTokens, temperature, model }) => {
  if (!env.groqApiKey) {
    throw new ApiError(500, 'CHATBOT_NOT_CONFIGURED', 'GROQ_API_KEY is missing');
  }

  const usedModel = model || env.groqModel;
  if (!usedModel) {
    throw new ApiError(500, 'CHATBOT_NOT_CONFIGURED', 'GROQ_MODEL is not configured');
  }

  const base = (env.groqApiBase || 'https://api.groq.com').replace(/\/$/, '');
  const headers = {
    Authorization: `Bearer ${env.groqApiKey}`,
    'Content-Type': 'application/json',
  };

  const timeout = 20000;

  // Attempt 1: model-specific generate
  try {
    const url = `${base}/v1/models/${encodeURIComponent(usedModel)}/generate`;
    const resp = await axios.post(
      url,
      {
        input: prompt,
        max_output_tokens: maxTokens || env.groqMaxOutputTokens,
        temperature: typeof temperature === 'number' ? temperature : env.groqTemperature,
      },
      { headers, timeout },
    );

    const parsed = parseResponse(resp.data, maxTokens);
    if (parsed) return parsed;
  } catch (err) {
    // handle unknown_url -> try fallback endpoints
    const status = err.response?.status;
    const bodyErr = err.response?.data;
    const msg = bodyErr?.error?.message || bodyErr || err.message;
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new ApiError(502, 'CHATBOT_PROVIDER_ERROR', `Failed to resolve Groq API host (${env.groqApiBase || 'api.groq.com'}). Check GROQ_API_BASE and network/DNS.`);
    }

    // If it's not the unknown URL case, but still has a response body, and not 404 unknown_url, rethrow after wrapping
    if (!(status === 404 && typeof msg === 'string' && msg.includes('Unknown request URL'))) {
      const wrapMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
      throw new ApiError(status || 502, 'CHATBOT_PROVIDER_ERROR', wrapMsg);
    }
    // else fallthrough to try alternate endpoints
  }

  // Attempt 2: generic generate endpoint with model in body
  try {
    const url = `${base}/v1/generate`;
    const resp = await axios.post(
      url,
      {
        model: usedModel,
        input: prompt,
        max_output_tokens: maxTokens || env.groqMaxOutputTokens,
        temperature: typeof temperature === 'number' ? temperature : env.groqTemperature,
      },
      { headers, timeout },
    );

    const parsed = parseResponse(resp.data, maxTokens);
    if (parsed) return parsed;
  } catch (err) {
    const status = err.response?.status;
    const bodyErr = err.response?.data;
    const msg = bodyErr?.error?.message || bodyErr || err.message;
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new ApiError(502, 'CHATBOT_PROVIDER_ERROR', `Failed to resolve Groq API host (${env.groqApiBase || 'api.groq.com'}). Check GROQ_API_BASE and network/DNS.`);
    }
    if (!(status === 404 && typeof msg === 'string' && msg.includes('Unknown request URL'))) {
      const wrapMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
      throw new ApiError(status || 502, 'CHATBOT_PROVIDER_ERROR', wrapMsg);
    }
    // else fallthrough to try OpenAI-compatible path
  }

  // Attempt 3: OpenAI-compatible chat completions path under Groq host
  try {
    const url = `${base}/openai/v1/chat/completions`;
    const resp = await axios.post(
      url,
      {
        model: usedModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens || env.groqMaxOutputTokens,
        temperature: typeof temperature === 'number' ? temperature : env.groqTemperature,
      },
      { headers, timeout },
    );

    const parsed = parseResponse(resp.data, maxTokens);
    if (parsed) return parsed;
  } catch (err) {
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new ApiError(502, 'CHATBOT_PROVIDER_ERROR', `Failed to resolve Groq API host (${env.groqApiBase || 'api.groq.com'}). Check GROQ_API_BASE and network/DNS.`);
    }
    const status = err.response?.status || 502;
    const bodyErr = err.response?.data;
    const errMsg = bodyErr?.error?.message || bodyErr || err.message || 'Groq provider error';
    throw new ApiError(status, 'CHATBOT_PROVIDER_ERROR', typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
  }

  // If all attempts failed to produce content, return a generic error
  throw new ApiError(502, 'CHATBOT_PROVIDER_ERROR', 'Groq provider returned no usable content');
};

module.exports = {
  generate,
};

