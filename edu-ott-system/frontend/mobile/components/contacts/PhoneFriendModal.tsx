import React from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { UserInfo } from '@/types/chat';
import SuggestionUserRow from './SuggestionUserRow';

type PhoneFriendModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: any;
  phoneSearch: string;
  setPhoneSearch: (value: string) => void;
  findingPhone: boolean;
  onFindByPhone: () => void;
  phoneResult: UserInfo | null;
  sentFriendRequestIds: string[];
  getUserId: (u: UserInfo) => string;
  onAddFriend: (userId: string) => void;
};

export default function PhoneFriendModal({
  visible,
  onClose,
  brand,
  colors,
  phoneSearch,
  setPhoneSearch,
  findingPhone,
  onFindByPhone,
  phoneResult,
  sentFriendRequestIds,
  getUserId,
  onAddFriend,
}: PhoneFriendModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Kết bạn theo số điện thoại</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          <TextInput
            value={phoneSearch}
            onChangeText={setPhoneSearch}
            placeholder="Nhập số điện thoại"
            placeholderTextColor={colors.muted}
            keyboardType="phone-pad"
            style={{ borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, borderColor: colors.border, color: colors.text }}
          />
          <TouchableOpacity style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: brand }} onPress={onFindByPhone} disabled={findingPhone}>
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
              {findingPhone ? 'Đang tìm...' : 'Tìm tài khoản'}
            </Text>
          </TouchableOpacity>
        </View>

        {phoneResult ? (
          <SuggestionUserRow
            item={phoneResult}
            brand={brand}
            colors={colors}
            sentFriendRequestIds={sentFriendRequestIds}
            getUserId={getUserId}
            onAddFriend={onAddFriend}
          />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
            <Text style={{ color: colors.muted }}>Nhập số điện thoại để tìm và kết bạn.</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
