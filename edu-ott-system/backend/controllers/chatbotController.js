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
    console.error('Chatbot Error:', _error.message);
    // Keep existing rule-based bot as fallback to avoid breaking user flow
    payload = {
      reply: 'Xin lỗi, tôi đang gặp sự cố khi xử lý yêu cầu. Vui lòng thử lại sau.',
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
