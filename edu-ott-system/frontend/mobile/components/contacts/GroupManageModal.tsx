import React from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Conversation, UserInfo } from '@/types/chat';

type GroupManageModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: any;
  colorScheme: 'light' | 'dark';
  selectedGroup: Conversation | null;
  groupActionLoading: boolean;
  currentUserId: string;
  getUserId: (u: UserInfo) => string;
  getConversationUserId: (value: string | UserInfo | undefined) => string;
  openTextEditor: (title: string, placeholder: string, onSubmit: (value: string) => void, defaultValue?: string) => void;
  handleGroupAction: (action: () => Promise<any>, successMessage: string) => void;
  updateGroupName: (groupId: string, name: string) => Promise<any>;
  updateGroupAvatar: (groupId: string, url: string) => Promise<any>;
  setAddMembersVisible: (v: boolean) => void;
  setSelectedMembersToAdd: (v: string[]) => void;
  promoteGroupAdmin: (groupId: string, userId: string) => Promise<any>;
  demoteGroupAdmin: (groupId: string, userId: string) => Promise<any>;
  removeGroupMember: (groupId: string, userId: string) => Promise<any>;
  leaveGroup: (groupId: string) => Promise<any>;
};

export default function GroupManageModal({
  visible,
  onClose,
  brand,
  colors,
  colorScheme,
  selectedGroup,
  groupActionLoading,
  currentUserId,
  getUserId,
  getConversationUserId,
  openTextEditor,
  handleGroupAction,
  updateGroupName,
  updateGroupAvatar,
  setAddMembersVisible,
  setSelectedMembersToAdd,
  promoteGroupAdmin,
  demoteGroupAdmin,
  removeGroupMember,
  leaveGroup,
}: GroupManageModalProps) {

  const ownerId = selectedGroup ? (getConversationUserId(selectedGroup.ownerId) || selectedGroup.createdBy) : '';
  const adminIds = selectedGroup ? (selectedGroup.adminIds || []).map(admin => getConversationUserId(admin)) : [];
  const isOwner = selectedGroup ? ownerId === currentUserId : false;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 }, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={[{ fontSize: 18, fontWeight: '700' }, { color: colors.text }]}>Quản lý nhóm</Text>
          <View style={{ width: 40 }} />
        </View>
        {selectedGroup ? (
          <FlatList
            data={selectedGroup.participants as UserInfo[] || []}
            keyExtractor={(item, index) => getUserId(item) || `participant-${index}`}
            ListHeaderComponent={
              <View style={{ padding: 16, gap: 10, backgroundColor: 'transparent' }}>
                <Text style={[{ fontSize: 16, fontWeight: '600' }, { color: colors.text }]}>{selectedGroup.name || 'Nhóm không tên'}</Text>
                
                <TouchableOpacity
                  style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 }, { backgroundColor: colorScheme === 'dark' ? '#312E81' : '#EEF2FF', borderColor: colors.border }]}
                  disabled={groupActionLoading}
                  onPress={() =>
                    openTextEditor(
                      'Đổi tên nhóm',
                      'Nhập tên mới',
                      (value) => handleGroupAction(() => updateGroupName(selectedGroup._id, value), 'Đã cập nhật tên nhóm'),
                      selectedGroup.name || '',
                    )
                  }
                >
                  <Text style={{ color: colorScheme === 'dark' ? '#A5B4FC' : '#3730A3', fontWeight: '700' }}>Đổi tên nhóm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 }, { backgroundColor: colorScheme === 'dark' ? '#4C1D95' : '#F3E8FF', borderColor: colors.border }]}
                  disabled={groupActionLoading}
                  onPress={() =>
                    openTextEditor(
                      'Đổi ảnh nhóm',
                      'Nhập URL ảnh nhóm',
                      (value) => handleGroupAction(() => updateGroupAvatar(selectedGroup._id, value), 'Đã cập nhật ảnh nhóm'),
                      selectedGroup.avatarUrl || '',
                    )
                  }
                >
                  <Text style={{ color: colorScheme === 'dark' ? '#DDD6FE' : '#7E22CE', fontWeight: '700' }}>Đổi ảnh nhóm</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 }, { backgroundColor: colorScheme === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: colors.border }]}
                  disabled={groupActionLoading}
                  onPress={() => {
                    setSelectedMembersToAdd([]);
                    setAddMembersVisible(true);
                  }}
                >
                  <Text style={{ color: colorScheme === 'dark' ? '#6EE7B7' : '#065F46', fontWeight: '700' }}>Thêm thành viên</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 }, { backgroundColor: colorScheme === 'dark' ? '#7F1D1D' : '#FEF2F2', borderColor: colors.border }]}
                  disabled={groupActionLoading}
                  onPress={() => handleGroupAction(() => leaveGroup(selectedGroup._id), 'Đã rời khỏi nhóm')}
                >
                  <Text style={{ color: colorScheme === 'dark' ? '#FCA5A5' : '#991B1B', fontWeight: '700' }}>Rời nhóm</Text>
                </TouchableOpacity>

                <Text style={[{ fontSize: 16, fontWeight: '700', marginTop: 12 }, { color: colors.text }]}>Thành viên ({selectedGroup.participants?.length || 0})</Text>
              </View>
            }
            renderItem={({ item }) => {
              const pid = getUserId(item);
              const isItemOwner = pid === ownerId;
              const isItemAdmin = adminIds.includes(pid);
              const isMe = pid === currentUserId;

              return (
                <View style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth }, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                  <Image
                    source={{
                      uri:
                        item.avatarUrl ||
                         `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=2563EB&color=fff&size=100&bold=true`,
                    }}
                    style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
                  />
                  <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <Text style={[{ fontSize: 16, fontWeight: '600' }, { color: colors.text }]}>
                      {item.username} {isMe ? '(Tôi)' : ''}
                    </Text>
                    {isItemOwner && <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>Trưởng nhóm</Text>}
                    {isItemAdmin && !isItemOwner && <Text style={{ color: '#0EA5E9', fontSize: 12, fontWeight: '600' }}>Phó nhóm</Text>}
                  </View>

                  {isOwner && !isMe && (
                    <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'transparent' }}>
                      {!isItemAdmin && (
                        <TouchableOpacity
                          style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, { backgroundColor: '#E0F2FE' }]}
                          onPress={() => handleGroupAction(() => promoteGroupAdmin(selectedGroup._id, pid), 'Đã phong quyền Phó nhóm')}
                        >
                          <Text style={{ color: '#0284C7', fontWeight: '700', fontSize: 11 }}>+Phó nhóm</Text>
                        </TouchableOpacity>
                      )}
                      {isItemAdmin && !isItemOwner && (
                        <TouchableOpacity
                          style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, { backgroundColor: '#FEF2F2' }]}
                          onPress={() => handleGroupAction(() => demoteGroupAdmin(selectedGroup._id, pid), 'Đã tước quyền Phó nhóm')}
                        >
                          <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 11 }}>-Phó nhóm</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }, { backgroundColor: '#FEE2E2' }]}
                        onPress={() => handleGroupAction(() => removeGroupMember(selectedGroup._id, pid), 'Đã xóa thành viên khỏi nhóm')}
                      >
                        <Text style={{ color: '#B91C1C', fontWeight: '700', fontSize: 11 }}>Xóa</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}

import { StyleSheet } from 'react-native';
