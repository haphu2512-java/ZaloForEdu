import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import type { UserInfo } from '@/types/chat';
import type { FriendRequest } from '@/types/friend';

type FriendRequestsModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: any;
  incomingRequests: FriendRequest[];
  processingRequestId: string | null;
  handleRespondRequest: (requestId: string, action: 'accept' | 'reject') => void;
  getRequestSender: (req: FriendRequest) => UserInfo | null;
};

export default function FriendRequestsModal({
  visible,
  onClose,
  brand,
  colors,
  incomingRequests,
  processingRequestId,
  handleRespondRequest,
  getRequestSender,
}: FriendRequestsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 }, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={[{ fontSize: 18, fontWeight: '700' }, { color: colors.text }]}>Lời mời kết bạn</Text>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.muted }}>Không có lời mời nào</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sender = getRequestSender(item);
            return (
              <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth }, { borderBottomColor: colors.border }]}>
                <Image
                  source={{
                    uri:
                      sender?.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.username || 'User')}&background=2563EB&color=fff&size=100&bold=true`,
                  }}
                  style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                />
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '600' }, { color: colors.text }]}>{sender?.username || 'Người dùng'}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {sender?.email || sender?.phone || 'Đã gửi lời mời kết bạn'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }, { backgroundColor: '#DCFCE7' }]}
                  disabled={processingRequestId === item._id}
                  onPress={() => handleRespondRequest(item._id, 'accept')}
                >
                  <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Đồng ý</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }, { backgroundColor: '#F3F4F6' }]}
                  disabled={processingRequestId === item._id}
                  onPress={() => handleRespondRequest(item._id, 'reject')}
                >
                  <Text style={{ color: '#374151', fontWeight: '700', fontSize: 12 }}>Từ chối</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// Internal StyleSheet
import { StyleSheet } from 'react-native';
