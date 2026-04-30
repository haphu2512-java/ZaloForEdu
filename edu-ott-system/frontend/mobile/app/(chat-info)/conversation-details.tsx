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
  Switch,
  Clipboard,
  Share,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  getConversations,
  getMessages,
  updateGroupName,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwner,
  leaveGroup,
  disbandGroup,
  updateGroupAvatar,
  updateGroupNickname,
  updateConversationPreference,
} from '@/utils/messageService';
import { uploadImageToCloudinary } from '@/utils/mediaService';
import type { Conversation, UserInfo } from '@/types/chat';
import { getFriendList } from '@/utils/friendService';
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
  const [membersVisible, setMembersVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [editorSubmit, setEditorSubmit] = useState<null | ((val: string) => void)>(null);
  const [transferLeaveVisible, setTransferLeaveVisible] = useState(false);
  // Feature 4 & 5
  const [approvalEnabled, setApprovalEnabled] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [onlyAdminChat, setOnlyAdminChat] = useState(false);
  const [markAdminMessages, setMarkAdminMessages] = useState(false);
  const [notificationMode, setNotificationMode] = useState<'all' | 'mention_only' | 'mute'>('all');
  const [sharedMedia, setSharedMedia] = useState<any[]>([]);
  const [sharedFiles, setSharedFiles] = useState<any[]>([]);
  const [sharedLinks, setSharedLinks] = useState<string[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);

  const currentUserId = user?.id || '';
  const linkRegex = /(mobileapp:\/\/[^\s]+|https?:\/\/[^\s]+)/gi;

  const isImageMedia = (mimeType?: string, fileName?: string) => {
    if (mimeType?.startsWith('image/')) return true;
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName || '');
  };

  const isFileMedia = (mimeType?: string, fileName?: string) => {
    if (!mimeType && !fileName) return false;
    return !isImageMedia(mimeType, fileName);
  };

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
      // Sync settings
      if (matched?.settings) {
        setApprovalEnabled(!!matched.settings.isApprovalRequired);
        setOnlyAdminChat(matched.settings.canMembersSendMessages === false);
        setMarkAdminMessages(!!matched.settings.markAdminMessages);
      }
      if (matched?.preference?.notificationMode) {
        setNotificationMode(matched.preference.notificationMode);
      }

      setSharedLoading(true);
      const msgRes = await getMessages({ conversationId: String(id), limit: 80 });
      const medias: any[] = [];
      const files: any[] = [];
      const links = new Set<string>();

      (msgRes?.items || []).forEach((m: any) => {
        const content = m?.content || '';
        const foundLinks = content.match(linkRegex);
        if (foundLinks?.length) foundLinks.forEach((l: string) => links.add(l));

        (m?.mediaIds || []).forEach((media: any) => {
          if (!media || typeof media === 'string') return;
          if (isImageMedia(media.mimeType, media.fileName)) medias.push(media);
          else if (isFileMedia(media.mimeType, media.fileName)) files.push(media);
        });
      });

      setSharedMedia(medias.slice(0, 8));
      setSharedFiles(files.slice(0, 8));
      setSharedLinks(Array.from(links).slice(0, 8));
    } catch (error: any) {
      console.log('Failed to load conversation details', error.message);
    } finally {
      setSharedLoading(false);
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
      const res = await actionFn();
      if (res && (res._id || res.id)) {
        setConversation((prev) => prev ? { ...prev, ...res } : res);
      }
      await loadData();
      Alert.alert('Thành công', successMsg);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleGroupSetting = async (key: string, value: boolean) => {
    try {
      setActionLoading(true);
      await updateGroupSettings(conversation._id, { [key]: value });
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons
                name={isMemOwner ? 'ribbon' : isMemAdmin ? 'shield-checkmark' : 'person'}
                size={12}
                color={isMemOwner ? '#EF4444' : isMemAdmin ? '#F59E0B' : colors.muted}
              />
              <Text style={{ color: isMemOwner ? '#EF4444' : isMemAdmin ? '#F59E0B' : colors.muted, fontSize: 12, fontWeight: '600' }}>
                {isMemOwner ? 'Trưởng nhóm' : isMemAdmin ? 'Phó nhóm' : 'Thành viên'}
              </Text>
            </View>
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
            {iAmAdmin && !isMemOwner && (iAmOwner || !isMemAdmin) && (
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() =>
                  Alert.alert('Xác nhận', `Mời ${member.username} ra khỏi nhóm?`, [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Mời ra', style: 'destructive', onPress: () => handleAction(() => removeGroupMember(conversation._id, uid), 'Đã mời thành viên ra khỏi nhóm') }
                  ])
                }
              >
                <Text style={{ color: '#991B1B', fontWeight: 'bold', fontSize: 11 }}>Mời ra</Text>
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

        {isGroup && (
          <View style={[styles.quickActionsWrap, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push({ pathname: '/search-messages', params: { id: conversation._id } } as any)}>
              <View style={styles.quickIconCircle}><Ionicons name="search" size={24} color={colors.text} /></View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tìm{'\n'}tin nhắn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                if (!iAmAdmin) {
                  Alert.alert('Thông báo', 'Chỉ quản trị viên mới có thể thêm thành viên');
                  return;
                }
                setSelectedMembersToAdd([]);
                setAddMembersVisible(true);
              }}
            >
              <View style={styles.quickIconCircle}><Ionicons name="person-add" size={24} color={colors.text} /></View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Thêm{'\n'}thành viên</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push({ pathname: '/pinned-messages', params: { id: conversation._id } } as any)}>
              <View style={styles.quickIconCircle}><Ionicons name="pin-outline" size={24} color={colors.text} /></View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tin nhắn{'\n'}đã ghim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={async () => {
                try {
                  const next = notificationMode === 'mute' ? 'all' : 'mute';
                  setNotificationMode(next);
                  await updateConversationPreference(conversation._id, { notificationMode: next });
                  Alert.alert('Thành công', next === 'mute' ? 'Đã tắt thông báo' : 'Đã bật thông báo');
                } catch (err: any) {
                  Alert.alert('Lỗi', err.message || 'Không thể cập nhật thông báo');
                }
              }}
            >
              <View style={styles.quickIconCircle}><Ionicons name={notificationMode === 'mute' ? 'notifications-off-outline' : 'notifications-outline'} size={24} color={colors.text} /></View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tắt{'\n'}thông báo</Text>
            </TouchableOpacity>
          </View>
        )}

        {isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 8 }]}>
            <TouchableOpacity style={[styles.optionItem, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={22} color={colors.text} style={{ width: 30, marginRight: 10 }} />
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Ảnh, file, link</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>

            {sharedLoading ? (
              <ActivityIndicator size="small" color={brand} style={{ marginVertical: 10 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sharedRow}>
                {sharedMedia.map((media: any) => (
                  <TouchableOpacity key={media._id || media.id || media.url} onPress={() => media.url && Linking.openURL(media.url)}>
                    <Image source={{ uri: media.url }} style={styles.sharedThumb} />
                  </TouchableOpacity>
                ))}

                {sharedFiles.map((file: any) => (
                  <TouchableOpacity key={file._id || file.id || file.fileName} style={[styles.sharedFileCard, { borderColor: colors.border }]} onPress={() => file.url && Linking.openURL(file.url)}>
                    <Ionicons name="document-attach-outline" size={20} color={colors.text} />
                    <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
                      {file.fileName || 'File'}
                    </Text>
                  </TouchableOpacity>
                ))}

                {sharedLinks.map((link) => (
                  <TouchableOpacity key={link} style={[styles.sharedFileCard, { borderColor: colors.border }]} onPress={() => Linking.openURL(link)}>
                    <Ionicons name="link-outline" size={20} color={colors.text} />
                    <Text numberOfLines={2} style={{ color: colors.text, fontSize: 12, marginTop: 4 }}>
                      {link}
                    </Text>
                  </TouchableOpacity>
                ))}

                {sharedMedia.length === 0 && sharedFiles.length === 0 && sharedLinks.length === 0 && (
                  <Text style={{ color: colors.muted, paddingVertical: 12 }}>Chưa có ảnh, file hoặc link</Text>
                )}
              </ScrollView>
            )}
          </View>
        )}

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

              {/* Cài đặt cá nhân */}
              <View style={{ marginTop: 16 }}>
                <Text style={[styles.sectionTitle, { color: colors.muted }]}>Cài đặt cá nhân</Text>

                <View style={[styles.optionItem, { justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>Thông báo</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['all', 'mention_only', 'mute'] as const).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        onPress={async () => {
                          try {
                            setNotificationMode(mode);
                            await updateConversationPreference(conversation._id, { notificationMode: mode });
                          } catch (err: any) { Alert.alert('Lỗi', err.message); }
                        }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 20,
                          backgroundColor: notificationMode === mode ? brand : '#F3F4F6',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: notificationMode === mode ? '#fff' : '#4B5563' }}>
                          {mode === 'all' ? 'Tất cả' : mode === 'mention_only' ? '@Mention' : 'Tắt'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Cài đặt nhóm (Chỉ cho Admin) */}
              {isGroup && iAmAdmin && (
                <View style={{ marginTop: 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 16 }}>
                  <Text style={[styles.sectionTitle, { color: colors.muted }]}>Cài đặt nhóm (Chỉ Admin)</Text>

                  <View style={[styles.optionItem, { justifyContent: 'space-between' }]}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>Duyệt thành viên mới</Text>
                    <Switch
                      value={approvalEnabled}
                      onValueChange={(val) => { setApprovalEnabled(val); toggleGroupSetting('isApprovalRequired', val); }}
                      trackColor={{ false: '#D1D5DB', true: brand + '80' }}
                      thumbColor={approvalEnabled ? brand : '#F3F4F6'}
                    />
                  </View>

                  <View style={[styles.optionItem, { justifyContent: 'space-between' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 16 }}>Chế độ chỉ Admin nhắn tin</Text>
                    </View>
                    <Switch
                      value={onlyAdminChat}
                      onValueChange={(val) => { setOnlyAdminChat(val); toggleGroupSetting('canMembersSendMessages', !val); }}
                      trackColor={{ false: '#D1D5DB', true: brand + '80' }}
                      thumbColor={onlyAdminChat ? brand : '#F3F4F6'}
                    />
                  </View>

                  <View style={[styles.optionItem, { justifyContent: 'space-between' }]}>
                    <Text style={{ color: colors.text, fontSize: 16 }}>Đánh dấu tin nhắn Admin</Text>
                    <Switch
                      value={markAdminMessages}
                      onValueChange={(val) => { setMarkAdminMessages(val); toggleGroupSetting('markAdminMessages', val); }}
                      trackColor={{ false: '#D1D5DB', true: brand + '80' }}
                      thumbColor={markAdminMessages ? brand : '#F3F4F6'}
                    />
                  </View>
                </View>
              )}
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
                  const scheme = Constants.expoConfig?.scheme || 'mobileapp';
                  setInviteLink(`${scheme}://join-group?code=${encodeURIComponent(res.inviteCode)}`);
                  setQrModalVisible(true);
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
          <TouchableOpacity style={[styles.optionItem, { justifyContent: 'space-between' }]} onPress={() => setMembersVisible(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="people-outline" size={24} color={colors.text} style={{ width: 30, marginRight: 15 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                Xem thành viên ({conversation.participants?.length || 0})
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
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
            {iAmOwner ? (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() =>
                  Alert.alert(
                    'Giai tan nhom',
                    'Hanh dong nay se xoa nhom va toan bo tin nhan. Ban co chac chan?',
                    [
                      { text: 'Huy', style: 'cancel' },
                      {
                        text: 'Giai tan',
                        style: 'destructive',
                        onPress: () =>
                          handleAction(() => disbandGroup(conversation._id), 'Da giai tan nhom').then(() =>
                            router.replace('/(tabs)'),
                          ),
                      },
                    ],
                  )
                }
              >
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <Text style={styles.dangerBtnText}>Giai tan nhom</Text>
              </TouchableOpacity>
            ) : null}
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

      {/* Members Modal */}
      <Modal visible={membersVisible} animationType="slide" onRequestClose={() => setMembersVisible(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setMembersVisible(false)}>
              <Text style={{ color: brand, fontWeight: 'bold' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
              Thành viên ({conversation.participants?.length || 0})
            </Text>
            <View style={{ width: 30 }} />
          </View>
          <ScrollView>
            {(conversation.participants || []).map(renderMember)}
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

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <TouchableOpacity style={styles.editorOverlay} activeOpacity={1} onPress={() => setQrModalVisible(false)}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface, alignItems: 'center' }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>Mã QR của nhóm</Text>
            {inviteLink ? (
              <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 12 }}>
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteLink)}` }}
                  style={{ width: 250, height: 250 }}
                />
              </View>
            ) : <ActivityIndicator size="large" color={brand} />}
            <Text style={{ color: colors.muted, marginTop: 12, textAlign: 'center', fontSize: 13 }}>Thành viên có thể quét mã này để tham gia nhóm</Text>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: '#F3F4F6', borderRadius: 8, alignItems: 'center' }}
                onPress={() => { setQrModalVisible(false); Clipboard.setString(inviteLink || ''); Alert.alert('Đã sao chép link!'); }}
              >
                <Text style={{ fontWeight: 'bold', color: '#374151' }}>Sao chép link</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, backgroundColor: brand, borderRadius: 8, alignItems: 'center' }}
                onPress={() => setQrModalVisible(false)}
              >
                <Text style={{ fontWeight: 'bold', color: '#fff' }}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
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
  quickActionsWrap: {
    marginHorizontal: 12,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  quickActionItem: { alignItems: 'center', gap: 8, width: '24%' },
  quickIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
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
  sharedRow: { paddingBottom: 8, gap: 10 },
  sharedThumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: '#E5E7EB' },
  sharedFileCard: { width: 120, height: 88, borderRadius: 10, borderWidth: 1, padding: 8, justifyContent: 'center' },
});
