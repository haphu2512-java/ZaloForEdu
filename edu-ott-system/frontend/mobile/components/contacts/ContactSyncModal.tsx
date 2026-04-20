import React from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import type { UserInfo } from '@/types/chat';
import SuggestionUserRow from './SuggestionUserRow';

type ContactSyncModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: any;
  syncingContacts: boolean;
  onSyncContacts: () => void;
  deviceContactsCount: number;
  syncedContactMatches: UserInfo[];
  sentFriendRequestIds: string[];
  getUserId: (u: UserInfo) => string;
  onAddFriend: (userId: string) => void;
};

export default function ContactSyncModal({
  visible,
  onClose,
  brand,
  colors,
  syncingContacts,
  onSyncContacts,
  deviceContactsCount,
  syncedContactMatches,
  sentFriendRequestIds,
  getUserId,
  onAddFriend,
}: ContactSyncModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Đồng bộ danh bạ</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            Ứng dụng sẽ xin quyền và tải số điện thoại từ danh bạ trên thiết bị của bạn.
          </Text>
          <TouchableOpacity
            style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#16A34A' }}
            onPress={onSyncContacts}
            disabled={syncingContacts}
          >
            <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
              {syncingContacts ? 'Đang tải danh bạ...' : 'Tải danh bạ điện thoại'}
            </Text>
          </TouchableOpacity>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            Đã đọc {deviceContactsCount} số từ danh bạ thiết bị.
          </Text>
        </View>

        <FlatList
          data={syncedContactMatches}
          keyExtractor={(item, index) => getUserId(item) || `sync-${index}`}
          renderItem={({ item }) => (
            <SuggestionUserRow
              item={item}
              brand={brand}
              colors={colors}
              sentFriendRequestIds={sentFriendRequestIds}
              getUserId={getUserId}
              onAddFriend={onAddFriend}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: colors.muted }}>Chưa có kết quả đồng bộ.</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}
