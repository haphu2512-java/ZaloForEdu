import api from "./authService"; 

/**
 * Gửi tin nhắn đến chatbot backend
 * @param {string} message - Tin nhắn hiện tại của người dùng
 * @param {Array<{role: string, content: string}>} history - Lịch sử 12 tin nhắn gần nhất
 * @returns {Promise<{reply: string, model: string, createdAt: string}>}
 */
export const askChatbot = async (message, history = []) => {
  try {
    const response = await api.post("/chatbot/ask", { message, history });
    
    return response.data?.data || response.data;
    
  } catch (error) {
    console.error("ChatbotService Error:", error);
    throw error; 
  }
};

