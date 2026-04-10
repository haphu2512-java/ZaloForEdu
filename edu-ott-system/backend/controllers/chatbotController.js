const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

const generateReply = (message) => {
  const text = (message || '').trim().toLowerCase();

  if (!text) return 'Mình chưa nhận được nội dung câu hỏi. Bạn thử gửi lại nhé.';
  if (text.includes('xin chào') || text.includes('hello') || text.includes('hi')) {
    return 'Xin chào! Mình là AI ChatBot của ứng dụng. Mình có thể hỗ trợ giải thích tính năng, cài đặt và sử dụng app.';
  }
  if (text.includes('tạo nhóm')) {
    return 'Để tạo nhóm: vào tab Danh bạ > Nhóm > Tạo nhóm mới, nhập tên nhóm và chọn ít nhất 2 bạn bè.';
  }
  if (text.includes('đổi theme') || text.includes('giao diện')) {
    return 'Bạn có thể vào Cài đặt để đổi theme: Sáng, Tối hoặc Theo hệ thống.';
  }
  if (text.includes('thông báo')) {
    return 'Trong Cài đặt, bạn có thể bật/tắt thông báo đẩy, âm thanh và thông báo tin nhắn/nhóm.';
  }

  return 'Mình đã nhận câu hỏi của bạn. Hiện bot đang ở bản cơ bản nên chỉ trả lời theo tính năng trong app. Bạn có thể hỏi cụ thể hơn nhé.';
};

const askChatbot = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Message is required');
  }

  const reply = generateReply(message);
  return successResponse(
    res,
    {
      reply,
      model: 'local-rule-based-ai',
      createdAt: new Date().toISOString(),
    },
    'Chatbot answered',
  );
});

module.exports = {
  askChatbot,
};
