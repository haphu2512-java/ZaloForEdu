import React from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserInfo } from '@/types/chat';
import Colors from '@/constants/Colors';

type ThemeColors = typeof Colors.light;

type CreateGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  brand: string;
  colors: ThemeColors;
  groupActionLoading: boolean;
  handleCreateGroup: () => void;
  groupNameInput: string;
  setGroupNameInput: (val: string) => void;
  friends: UserInfo[];
  selectedGroupMembers: string[];
  toggleMemberSelection: (fid: string) => void;
  getUserId: (u: UserInfo) => string;
};

export default function CreateGroupModal({
  visible,
  onClose,
  brand,
  colors,
  groupActionLoading,
  handleCreateGroup,
  groupNameInput,
  setGroupNameInput,
  friends,
  selectedGroupMembers,
  toggleMemberSelection,
  getUserId,
}: CreateGroupModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 }, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
          </TouchableOpacity>
          <Text style={[{ fontSize: 18, fontWeight: '700' }, { color: colors.text }]}>Tạo nhóm</Text>
          <TouchableOpacity disabled={groupActionLoading} onPress={handleCreateGroup}>
            {groupActionLoading ? (
              <ActivityIndicator size="small" color={brand} />
            ) : (
              <Text style={{ color: groupActionLoading ? colors.muted : brand, fontWeight: '700' }}>Tạo</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ padding: 16, gap: 12, backgroundColor: 'transparent' }}>
          <TextInput
            value={groupNameInput}
            onChangeText={setGroupNameInput}
            placeholder="Nhập tên nhóm"
            placeholderTextColor={colors.muted}
            style={[{ borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 }, { borderColor: colors.border, color: colors.text }]}
          />
          <Text style={{ color: colors.muted, fontSize: 13 }}>Chọn tối thiểu 2 bạn bè để tạo nhóm</Text>
        </View>
        {friends.length <= 0 ? (
          <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.muted }}>Bạn chưa có bạn bè để tạo nhóm</Text>
          </View>
        ) : null}

        <FlatList
          data={friends}
          keyExtractor={(item, index) => getUserId(item) || `member-${index}`}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.muted }}>Bạn chưa có bạn bè để tạo nhóm</Text>
            </View>
          }
          renderItem={({ item }) => {
            const fid = getUserId(item);
            const checked = selectedGroupMembers.includes(fid);
            return (
              <TouchableOpacity
                style={[{ flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }, { backgroundColor: colors.surface }]}
                onPress={() => toggleMemberSelection(fid)}
              >
                <Image
                  source={{
                    uri:
                      item.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=2563EB&color=fff&size=100&bold=true`,
                  }}
                  style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                />
                <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                  <Text style={[{ fontSize: 16, fontWeight: '600', marginBottom: 2 }, { color: colors.text }]}>{item.username}</Text>
                </View>
                <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? brand : colors.muted} />
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}
