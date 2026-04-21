import { Modal, View, TouchableOpacity, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Conversation } from '@/types/chat';

type ChatForwardModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  conversations: Conversation[];
  currentUserId: string;
  isForwarding: boolean;
  onForward: (conversationId: string) => void;
  getConversationTitle: (conv: Conversation, currentUserId: string) => string;
};

export default function ChatForwardModal({
  visible,
  onClose,
  colors,
  conversations,
  currentUserId,
  isForwarding,
  onForward,
  getConversationTitle,
}: ChatForwardModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: colors.tint, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Chuyển tiếp</Text>
          <View style={{ width: 36 }} />
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item._id || item.id || ''}
          renderItem={({ item }) => (
            <TouchableOpacity
              disabled={isForwarding}
              onPress={() => onForward(item._id || item.id || '')}
              style={[styles.item, { borderBottomColor: colors.border }]}
            >
              <Text style={{ fontSize: 16, color: colors.text }}>
                {getConversationTitle(item, currentUserId)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

