import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { searchMessages } from '@/utils/searchService';
import type { Message } from '@/types/chat';

type SearchMessagesResponse = {
  items: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function getConversationId(message: Message): string {
  if (typeof message.conversationId === 'string') return message.conversationId;
  return (message.conversationId as any)?._id || '';
}

function getSenderName(message: Message): string {
  if (typeof message.senderId === 'string') return 'Người dùng';
  return message.senderId?.username || 'Người dùng';
}

export default function SearchMessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Message[]>([]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = (await searchMessages(query.trim(), null, 30)) as SearchMessagesResponse;
        setResults(res?.items || []);
      } catch (_error) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Tìm tin nhắn' }} />

      <View
        style={[
          styles.searchWrap,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          placeholder="Nhập nội dung cần tìm"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item._id || item.id || `message-${index}`}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.muted }}>
                {query.trim() ? 'Không tìm thấy kết quả' : 'Nhập từ khóa để tìm kiếm'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const conversationId = getConversationId(item);
            return (
              <TouchableOpacity
                style={[
                  styles.item,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => {
                  if (!conversationId) return;
                  router.push(`/chat/${conversationId}` as any);
                }}
              >
                <Text style={[styles.sender, { color: colors.text }]}>
                  {getSenderName(item)}
                </Text>
                <Text numberOfLines={2} style={{ color: colors.text }}>
                  {item.content || '(Tin nhắn không có nội dung)'}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    marginHorizontal: 14,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  sender: { fontSize: 13, fontWeight: '700' },
});
