import React from 'react';
import { Image, Modal, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { UserInfo } from '@/types/chat';
import SuggestionUserRow from './SuggestionUserRow';

type QrFriendModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: any;
  currentUserId: string;
  qrInput: string;
  setQrInput: (value: string) => void;
  onResolveQr: () => void;
  qrPreviewUser: UserInfo | null;
  sentFriendRequestIds: string[];
  getUserId: (u: UserInfo) => string;
  onAddFriend: (userId: string) => void;
};

export default function QrFriendModal({
  visible,
  onClose,
  brand,
  colors,
  currentUserId,
  qrInput,
  setQrInput,
  onResolveQr,
  qrPreviewUser,
  sentFriendRequestIds,
  getUserId,
  onAddFriend,
}: QrFriendModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Kết bạn bằng QR</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>QR của bạn</Text>
          <View style={{ borderWidth: 1, borderRadius: 12, alignItems: 'center', padding: 12, borderColor: colors.border, backgroundColor: colors.surface }}>
            <Image
              source={{
                uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`zaloedu://add-friend?uid=${currentUserId}`)}`,
              }}
              style={{ width: 180, height: 180 }}
            />
            <TouchableOpacity
              style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#4F46E5', marginTop: 10 }}
              onPress={() => Share.share({ message: `Kết bạn với mình: zaloedu://add-friend?uid=${currentUserId}` })}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>Chia sẻ mã của tôi</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            value={qrInput}
            onChangeText={setQrInput}
            placeholder="Dán mã QR hoặc user ID"
            placeholderTextColor={colors.muted}
            style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, borderColor: colors.border, color: colors.text }}
          />
          <TouchableOpacity style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: brand }} onPress={onResolveQr}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>Nhận diện mã</Text>
          </TouchableOpacity>
        </View>

        {qrPreviewUser ? (
          <SuggestionUserRow
            item={qrPreviewUser}
            brand={brand}
            colors={colors}
            sentFriendRequestIds={sentFriendRequestIds}
            getUserId={getUserId}
            onAddFriend={onAddFriend}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ color: colors.muted }}>Chưa có người dùng từ mã QR.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
