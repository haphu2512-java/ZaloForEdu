import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  getConversations,
  updateGroupName,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwner,
  leaveGroup,
  updateGroupAvatar,
  updateGroupNickname,
  updateConversationPreference,
} from '@/utils/messageService';
import { uploadImageToCloudinary } from '@/utils/mediaService';
import type { Conversation, UserInfo } from '@/types/chat';
import { getFriendList } from '@/utils/friendService';
import { Share, Clipboard } from 'react-native';
import {
  getInviteLink,
  resetInviteLink,
  updateGroupSettings,
  type InviteLinkResponse,
} from '@/utils/groupFeatureService';

export default function ConversationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [editorSubmit, setEditorSubmit] = useState<null | ((val: string) => void)>(null);
  const [transferLeaveVisible, setTransferLeaveVisible] = useState(false);
  // Feature 4 & 5
  const [approvalEnabled, setApprovalEnabled] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const currentUserId = user?.id || '';

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [convRes, friendsRes] = await Promise.all([
        getConversations(null, 100),
        getFriendList(null, 100),
      ]);
      const matched = (convRes?.items || []).find((c) => c._id === id || c.id === id);
      setConversation(matched || null);
      setFriends(friendsRes?.items || []);
      // Sync approval setting
      if (matched?.settings?.isApprovalRequired !== undefined) {
        setApprovalEnabled(matched.settings.isApprovalRequired);
      }
    } catch (error: any) {
      console.log('Failed to load conversation details', error.message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const init = async () => {
        if (!conversation) setLoading(true);
        await loadData();
        if (isActive) setLoading(false);
      };
      init();
      return () => {
        isActive = false;
      };
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading && !conversation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Không tìm thấy cuộc trò chuyện.</Text>
      </View>
    );
  }

  const isGroup = conversation.type === 'group';
  const ownerId = typeof conversation.ownerId === 'string' ? conversation.ownerId : conversation.ownerId?._id || conversation.createdBy;
  const adminIds = (conversation.adminIds || []).map((admin) => typeof admin === 'string' ? admin : admin._id || admin.id);
  const iAmOwner = ownerId === currentUserId;
  const iAmAdmin = iAmOwner || adminIds.includes(currentUserId);

  const getUserId = (val: any) => (typeof val === 'string' ? val : val?._id || val?.id || '');

  const otherParticipant = !isGroup
    ? conversation.participants?.find((p) => getUserId(p) !== currentUserId)
    : null;

  const title = isGroup
    ? conversation.name || 'Nhóm không tên'
    : conversation.preference?.nickname || otherParticipant?.username || 'Trò chuyện';

  const avatar = isGroup
    ? conversation.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=8B5CF6&color=fff&size=150&bold=true`
    : otherParticipant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=2563EB&color=fff&size=150&bold=true`;

  const handleAction = async (actionFn: () => Promise<any>, successMsg: string) => {
    try {
      setActionLoading(true);
      await actionFn();
      await loadData();
      Alert.alert('Thành công', successMsg);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditor = (title: string, defaultValue: string, onSubmit: (val: string) => void) => {
    setEditorTitle(title);
    setEditorValue(defaultValue);
    setEditorSubmit(() => onSubmit);
    setEditorVisible(true);
  };

  const handlePromoteClick = (member: any, isMemAdmin: boolean) => {
    const uid = getUserId(member);
    if (!conversation) return;
    
    if (isMemAdmin) {
      Alert.alert('Xác nhận', `Hạ quyền Phó nhóm của ${member.username}?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hạ quyền', onPress: () => handleAction(() => demoteGroupAdmin(conversation._id, uid), 'Đã hạ quyền') }
      ]);
    } else {
      Alert.alert(
        'Nâng quyền',
        `Chọn quyền muốn cấp cho ${member.username}`,
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Phó nhóm', onPress: () => handleAction(() => promoteGroupAdmin(conversation._id, uid), 'Đã cấp quyền Phó nhóm') },
          { text: 'Trưởng nhóm', onPress: () => handleAction(() => transferGroupOwner(conversation._id, { newOwnerId: uid }), 'Đã chuyển quyền Trưởng nhóm') },
        ]
      );
    }
  };

  const handleChangeGroupAvatar = async () => {
    if (!conversation) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    try {
      setActionLoading(true);
      const localUri = result.assets[0].uri;
      const uploadedUrl = await uploadImageToCloudinary(localUri);
      await updateGroupAvatar(conversation._id, uploadedUrl);
      await loadData();
      Alert.alert('Thành công', 'Đã đổi ảnh nhóm');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đổi ảnh nhóm');
    } finally {
      setActionLoading(false);
    }
  };

  const renderMember = (member: any) => {
    const uid = getUserId(member);
    const isMemOwner = ownerId === uid;
    const isMemAdmin = adminIds.includes(uid);
    const isMe = uid === currentUserId;

    return (
      <View key={uid} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
        <Image
          source={{
            uri:
              member.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}&background=0EA5E9&color=fff&size=100&bold=true`,
          }}
          style={styles.memberAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.memberName, { color: colors.text }]}>
            {member.username} {isMe && '(Bạn)'}
          </Text>
          {isGroup && (
            <Text style={{ color: isMemOwner ? '#EF4444' : isMemAdmin ? '#F59E0B' : colors.muted, fontSize: 12, fontWeight: '500' }}>
              {isMemOwner ? 'Trưởng nhóm' : isMemAdmin ? 'Phó nhóm' : 'Thành viên'}
            </Text>
          )}
        </View>

        {isGroup && !isMe && iAmAdmin && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {iAmOwner && !isMemOwner && (
               <TouchableOpacity
                 style={[styles.smallBtn, { backgroundColor: '#E0E7FF' }]}
                 onPress={() => handlePromoteClick(member, isMemAdmin)}
               >
                 <Text style={{ color: '#3730A3', fontWeight: 'bold', fontSize: 11 }}>{isMemAdmin ? 'Hạ quyền' : 'Nâng quyền'}</Text>
               </TouchableOpacity>
            )}
            {iAmAdmin && !isMemOwner && (
               <TouchableOpacity
                 style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                 onPress={() =>
                   Alert.alert('Xác nhận', `Đuổi ${member.username} khỏi nhóm?`, [
                     { text: 'Hủy', style: 'cancel' },
                     { text: 'Đuổi', style: 'destructive', onPress: () => handleAction(() => removeGroupMember(conversation._id, uid), 'Đã xóa thành viên') }
                   ])
                 }
               >
                 <Text style={{ color: '#991B1B', fontWeight: 'bold', fontSize: 11 }}>Xóa</Text>
               </TouchableOpacity>
            )}
            <TouchableOpacity
               style={[styles.smallBtn, { backgroundColor: '#FEF3C7' }]}
               onPress={() =>
                 openEditor('Biệt danh', '', (val) =>
                   handleAction(() => updateGroupNickname(conversation._id, uid, val), 'Đã cập nhật biệt danh')
                 )
               }
             >
               <Text style={{ color: '#92400E', fontWeight: 'bold', fontSize: 11 }}>Biệt danh</Text>
             </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerTitle: 'Tùy chọn',
          headerBackTitle: 'Quay lại',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
      >
        <View style={styles.headerProfile}>
          <Image source={{ uri: avatar }} style={styles.mainAvatar} />
          <Text style={[styles.mainTitle, { color: colors.text }]}>{title}</Text>
        </View>

        {!isGroup && (
          <View style={{ marginTop: 20 }}>
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.muted, fontSize: 13, textTransform: 'uppercase' }]}>Hành động khác</Text>
              
              <TouchableOpacity style={styles.optionItem} onPress={() => router.push({ pathname: '/create-group', params: { preselectedUserId: getUserId(otherParticipant) } } as any)}>
                <Ionicons name="people" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Tạo nhóm chat với {otherParticipant?.username}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => openEditor('Đổi biệt danh', conversation.preference?.nickname || otherParticipant?.username || '', (val) => handleAction(() => updateConversationPreference(conversation._id, { nickname: val }), 'Đã đổi biệt danh'))}>
                <Ionicons name="pencil" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Đổi biệt danh</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang cập nhật')}>
                <Ionicons name="images" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Xem file phương tiện, file và liên kết</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang cập nhật')}>
                <Ionicons name="pin" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Tin nhắn đã ghim</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang cập nhật')}>
                <Ionicons name="search" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Tìm kiếm trong cuộc trò chuyện</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 15 }]}>
              <Text style={[styles.sectionTitle, { color: colors.muted, fontSize: 13, textTransform: 'uppercase' }]}>Quyền riêng tư và hỗ trợ</Text>

              <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang cập nhật')}>
                <Ionicons name="shield-checkmark" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 16 }}>Quyền với tin nhắn</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.optionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang cập nhật')}>
                <Ionicons name="timer" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>Tin nhắn tự hủy</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>Tắt</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isGroup && iAmAdmin && (
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => openEditor('Đổi tên nhóm', conversation.name || '', (val) => handleAction(() => updateGroupName(conversation._id, val), 'Đã đổi tên nhóm'))}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="pencil" size={24} color="#4F46E5" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Đổi tên</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={handleChangeGroupAvatar}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="image" size={24} color="#9333EA" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Đổi ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => {
                setSelectedMembersToAdd([]);
                setAddMembersVisible(true);
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="person-add" size={24} color="#10B981" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Thêm TV</Text>
            </TouchableOpacity>

            {/* Feature 5: Invite link */}
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              disabled={inviteLoading}
              onPress={async () => {
                try {
                  setInviteLoading(true);
                  const res = await getInviteLink(conversation._id);
                  setInviteLink(res.inviteLink);
                  Alert.alert(
                    '🔗 Link mời',
                    res.inviteLink,
                    [
                      { text: 'Sao chép', onPress: () => { Clipboard.setString(res.inviteLink); Alert.alert('Đã sao chép!'); } },
                      { text: 'Chia sẻ', onPress: () => Share.share({ message: res.inviteLink }) },
                      { text: 'Đóng', style: 'cancel' },
                    ]
                  );
                } catch (err: any) {
                  Alert.alert('Lỗi', err.message);
                } finally {
                  setInviteLoading(false);
                }
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                {inviteLoading ? <ActivityIndicator color="#92400E" size="small" /> : <Ionicons name="link" size={22} color="#92400E" />}
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Link mời</Text>
            </TouchableOpacity>

            {/* Feature 4: Join approval */}
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.push({ pathname: '/join-requests', params: { id: conversation._id } } as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="people-circle" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Duyệt TV</Text>
            </TouchableOpacity>

            {/* Feature 2: Pinned messages board */}
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.push({ pathname: '/pinned-messages', params: { id: conversation._id } } as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="pin" size={22} color="#059669" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Bảng tin</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: brand }]}>Thành viên ({conversation.participants?.length || 0})</Text>
          {(conversation.participants || []).map(renderMember)}
        </View>

        {isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 16 }]}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                if (iAmOwner && (conversation.participants?.length || 0) > 1) {
                  setTransferLeaveVisible(true);
                } else {
                  Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn rời nhóm?', [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Rời nhóm', style: 'destructive', onPress: () => handleAction(() => leaveGroup(conversation._id), 'Đã rời nhóm').then(() => router.replace('/(tabs)')) }
                  ]);
                }
              }}
            >
              <Ionicons name="exit-outline" size={24} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Rời nhóm</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal visible={addMembersVisible} animationType="slide" onRequestClose={() => setAddMembersVisible(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAddMembersVisible(false)}>
              <Text style={{ color: brand, fontWeight: 'bold' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Thêm thành viên</Text>
            <TouchableOpacity
              disabled={actionLoading || selectedMembersToAdd.length === 0}
              onPress={() => {
                handleAction(() => addGroupMembers(conversation._id, selectedMembersToAdd), 'Đã thêm thành viên');
                setAddMembersVisible(false);
              }}
            >
              <Text style={{ color: selectedMembersToAdd.length > 0 ? brand : colors.muted, fontWeight: 'bold' }}>Xong</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {friends.map((friend) => {
              const fid = getUserId(friend);
              const isAlreadyMember = (conversation.participants || []).some((p) => getUserId(p) === fid);
              if (isAlreadyMember) return null;
              
              const checked = selectedMembersToAdd.includes(fid);
              return (
                <TouchableOpacity
                  key={fid}
                  style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  onPress={() => setSelectedMembersToAdd(prev => checked ? prev.filter(id => id !== fid) : [...prev, fid])}
                >
                  <Image source={{ uri: friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.username}` }} style={styles.memberAvatar} />
                  <Text style={[styles.memberName, { color: colors.text, flex: 1 }]}>{friend.username}</Text>
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? brand : colors.muted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Transfer Ownership & Leave Modal */}
      <Modal visible={transferLeaveVisible} animationType="slide" onRequestClose={() => setTransferLeaveVisible(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setTransferLeaveVisible(false)}>
              <Text style={{ color: brand, fontWeight: 'bold' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Nhường quyền</Text>
            <View style={{ width: 30 }} />
          </View>
          <View style={{ padding: 16, backgroundColor: colors.surface }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>Bạn là Trưởng nhóm. Vui lòng chọn một người thay thế trước khi rời nhóm.</Text>
          </View>
          <ScrollView>
            {(conversation.participants || []).map((member) => {
              const uid = getUserId(member);
              if (uid === currentUserId) return null;
              return (
                <TouchableOpacity
                  key={uid}
                  style={[styles.memberRow, { borderBottomColor: colors.border, paddingHorizontal: 16 }]}
                  onPress={() => {
                    Alert.alert('Xác nhận', `Nhường quyền Trưởng nhóm cho ${member.username} và rời khỏi nhóm này?`, [
                      { text: 'Hủy', style: 'cancel' },
                      { 
                        text: 'Chuyển và Rời', 
                        style: 'destructive', 
                        onPress: async () => {
                          try {
                            setActionLoading(true);
                            await transferGroupOwner(conversation._id, { newOwnerId: uid });
                            await leaveGroup(conversation._id);
                            setTransferLeaveVisible(false);
                            router.replace('/(tabs)');
                          } catch (error: any) {
                            Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
                            setActionLoading(false);
                          }
                        }
                      }
                    ]);
                  }}
                >
                  <Image source={{ uri: member.avatarUrl || `https://ui-avatars.com/api/?name=${member.username}` }} style={styles.memberAvatar} />
                  <Text style={[styles.memberName, { color: colors.text, flex: 1 }]}>{member.username}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* Editor Modal */}
      <Modal visible={editorVisible} transparent animationType="fade">
        <View style={styles.editorOverlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>{editorTitle}</Text>
            <TextInput
              style={[styles.editorInput, { borderColor: colors.border, color: colors.text }]}
              value={editorValue}
              onChangeText={setEditorValue}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setEditorVisible(false)} style={{ padding: 10 }}>
                <Text style={{ color: colors.muted, fontWeight: 'bold' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setEditorVisible(false);
                  if (editorSubmit) editorSubmit(editorValue);
                }}
                style={{ padding: 10, backgroundColor: brand, borderRadius: 8 }}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerProfile: { alignItems: 'center', paddingVertical: 24 },
  mainAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  mainTitle: { fontSize: 24, fontWeight: 'bold' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 20, gap: 8 },
  gridBtn: { width: '30%', alignItems: 'center', padding: 12, borderRadius: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  gridBtnText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  section: { paddingVertical: 8, paddingHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'transparent' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  memberAvatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
  memberName: { fontSize: 16 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, justifyContent: 'center' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, justifyContent: 'center', gap: 8 },
  dangerBtnText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
  fullModal: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  editorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  editorCard: { borderRadius: 16, padding: 20, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  editorInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
});
