import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { askChatbot } from '@/utils/chatbotService';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type BotMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export default function ChatBotTabScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Xin chào, mình là AI ChatBot. Bạn cần hỗ trợ gì về ứng dụng?',
    },
  ]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMessage: BotMessage = { id: `${Date.now()}-u`, role: 'user', text };
    setMessages((prev) => [userMessage, ...prev]);
    setInput('');
    setLoading(true);
    try {
      const res = await askChatbot(text);
      const botMessage: BotMessage = {
        id: `${Date.now()}-b`,
        role: 'assistant',
        text: res.reply || 'Mình chưa có câu trả lời phù hợp.',
      };
      setMessages((prev) => [botMessage, ...prev]);
    } catch (_error) {
      setMessages((prev) => [
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          text: 'Không thể kết nối ChatBot lúc này. Bạn thử lại sau nhé.',
        },
        ...prev,
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 16 }}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.bubble,
                isUser
                  ? { alignSelf: 'flex-end', backgroundColor: colors.tint }
                  : { alignSelf: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
              ]}
            >
              <Text style={{ color: isUser ? '#fff' : colors.text, fontSize: 15 }}>{item.text}</Text>
            </View>
          );
        }}
      />
      <View style={[styles.inputWrap, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Nhập câu hỏi cho AI ChatBot..."
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.tint : colors.border }]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bubble: {
    maxWidth: '82%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  inputWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
