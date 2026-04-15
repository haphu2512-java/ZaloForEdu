const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { askGemini } = require('../services/chatbotService');


const askChatbot = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message?.trim()) {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Message is required');
  }

  let payload;
  try {
    payload = await askGemini({ message, history });
  } catch (_error) {
    // Keep existing rule-based bot as fallback to avoid breaking user flow
    payload = {
      reply: generateReply(message),
      model: 'local-rule-based-ai-fallback',
      createdAt: new Date().toISOString(),
    };
  }

  return successResponse(
    res,
    payload,
    'Chatbot answered',
  );
});

module.exports = {
  askChatbot,
};
