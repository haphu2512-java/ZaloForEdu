import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import {
  addGroupMembers,
  createConversation,
  demoteGroupAdmin,
  disbandGroup,
  getConversations,
  getMessages,
  leaveGroup,
  muteConversation,
  pinConversation,
  promoteGroupAdmin,
  removeGroupMember,
  reportConversation,
  transferGroupOwner,
  updateConversationPreference,
  updateGroupAvatar,
  updateGroupName,
  updateGroupNickname,
} from '@/utils/messageService';
import { getFriendList } from '@/utils/friendService';
import { getBlockedUsers, blockOrUnblockUser, reportUser } from '@/utils/userService';
import { getMediaById, toAbsoluteMediaUrl, uploadImageToCloudinary } from '@/utils/mediaService';
import {
  buildGroupWebInviteLink,
  getInviteLink,
  resetInviteLink,
  type GroupSettingsPayload,
  updateGroupSettings,
} from '@/utils/groupFeatureService';
import type { Conversation, MediaItem, UserInfo } from '@/types/chat';

const MEMBER_PERMISSION_ITEMS: Array<{ key: keyof GroupSettingsPayload; label: string }> = [
  { key: 'canMembersUpdateInfo', label: 'Thay đổi tên và ảnh đại diện của nhóm' },
  { key: 'canMembersPin', label: 'Ghim tin nhắn, ghi chú, bình chọn lên đầu hội thoại' },
  { key: 'canMembersCreateReminders', label: 'Tạo mới ghi chú, nhắc hẹn' },
  { key: 'canMembersCreatePolls', label: 'Tạo mới bình chọn' },
  { key: 'canMembersSendMessages', label: 'Gửi tin nhắn' },
];

const GROUP_TOGGLE_ITEMS: Array<{ key: keyof GroupSettingsPayload; label: string }> = [
  { key: 'isApprovalRequired', label: 'Chế độ phê duyệt thành viên mới' },
  { key: 'markAdminMessages', label: 'Đánh dấu tin nhắn từ trưởng/phó nhóm' },
  { key: 'allowNewMembersReadHistory', label: 'Cho phép thành viên mới đọc tin nhắn gần nhất' },
  { key: 'allowInviteLink', label: 'Cho phép dùng link tham gia nhóm' },
];

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Không rõ dung lượng';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function normalizeMediaFromMessage(raw: any): MediaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = normalizeId(raw);
  const url = toAbsoluteMediaUrl(raw.url || '');
  if (!id && !url) return null;
  return {
    _id: id || url,
    id: id || url,
    uploaderId: normalizeId(raw.uploaderId || raw.userId || ''),
    fileName: raw.fileName || raw.name || 'Tệp đính kèm',
    mimeType: raw.mimeType || raw.type || 'application/octet-stream',
    size: Number(raw.size || 0),
    storage: raw.storage || 'local',
    url,
    providerPublicId: raw.providerPublicId || null,
    providerResourceType: raw.providerResourceType || null,
    duration: raw.duration,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export default function ConversationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [notificationMode, setNotificationMode] = useState<'all' | 'mention_only' | 'mute'>('all');
  const [imageVideoAssets, setImageVideoAssets] = useState<MediaItem[]>([]);
  const [fileAssets, setFileAssets] = useState<MediaItem[]>([]);
  const [linkAssets, setLinkAssets] = useState<string[]>([]);
  const [isDirectBlocked, setIsDirectBlocked] = useState(false);

  const [membersVisible, setMembersVisible] = useState(false);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [editorSubmit, setEditorSubmit] = useState<null | ((value: string) => void)>(null);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteWebLink, setInviteWebLink] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState<string>('');
  const [reportDescription, setReportDescription] = useState('');

  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const currentUserId = String(user?.id || (user as any)?._id || '');
  const ownerId = normalizeId(conversation?.ownerId || conversation?.createdBy);
  const adminIds = (conversation?.adminIds || []).map((a) => normalizeId(a));
  const isOwner = ownerId === currentUserId;
  const isAdmin = isOwner || adminIds.includes(currentUserId);
  const isGroup = conversation?.type === 'group';
  const otherParticipant = !isGroup
    ? (conversation?.participants || []).find((p) => normalizeId(p) !== currentUserId)
    : null;
  const otherUserId = normalizeId(otherParticipant);
  const canEditGroupInfo = isAdmin || conversation?.settings?.canMembersUpdateInfo !== false;
  const allowInviteLink = conversation?.settings?.allowInviteLink !== false;

  const title = useMemo(() => {
    if (!conversation) return 'Tùy chọn';
    if (conversation.type === 'group') return conversation.name || 'Nhóm không tên';
    const other = (conversation.participants || []).find((p) => normalizeId(p) !== currentUserId);
    return conversation.preference?.nickname || other?.username || 'Cuộc trò chuyện';
  }, [conversation, currentUserId]);

  const avatar = useMemo(() => {
    if (!conversation) return '';
    if (conversation.type === 'group') {
      return (
        conversation.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          title,
        )}&background=8B5CF6&color=fff&size=150&bold=true`
      );
    }
    const other = (conversation.participants || []).find((p) => normalizeId(p) !== currentUserId);
    return (
      other?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        title,
      )}&background=2563EB&color=fff&size=150&bold=true`
    );
  }, [conversation, currentUserId, title]);

  const loadConversationAssets = useCallback(async (conversationId: string) => {
    try {
      setAssetsLoading(true);
      const collectedMessages: any[] = [];
      let cursor: string | null = null;

      for (let page = 0; page < 3; page += 1) {
        const res = await getMessages({ conversationId, limit: 50, cursor: cursor || undefined });
        collectedMessages.push(...(res.items || []));
        cursor = res.nextCursor;
        if (!cursor) break;
      }

      const mediaMap = new Map<string, MediaItem>();
      const missingMediaIds = new Set<string>();
      const links = new Set<string>();

      collectedMessages.forEach((msg) => {
        const content = msg?.content || '';
        const foundLinks = (content.match(URL_REGEX) || []) as string[];
        foundLinks.forEach((link: string) => links.add(link));

        (msg?.mediaIds || []).forEach((mediaItem: any) => {
          if (typeof mediaItem === 'string') {
            missingMediaIds.add(mediaItem);
            return;
          }
          const normalized = normalizeMediaFromMessage(mediaItem);
          if (normalized) mediaMap.set(normalized._id || normalized.url, normalized);
        });
      });

      if (missingMediaIds.size > 0) {
        const fetched = await Promise.allSettled(
          Array.from(missingMediaIds).map(async (mediaId) => getMediaById(mediaId)),
        );
        fetched.forEach((result) => {
          if (result.status === 'fulfilled') {
            const media = result.value;
            mediaMap.set(media._id || media.url, media);
          }
        });
      }

      const mediaList = Array.from(mediaMap.values());
      const imageVideos = mediaList.filter(
        (m) => m.mimeType?.startsWith('image/') || m.mimeType?.startsWith('video/'),
      );
      const files = mediaList.filter(
        (m) => !m.mimeType?.startsWith('image/') && !m.mimeType?.startsWith('video/'),
      );

      setImageVideoAssets(imageVideos);
      setFileAssets(files);
      setLinkAssets(Array.from(links));
    } catch {
      setImageVideoAssets([]);
      setFileAssets([]);
      setLinkAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [convRes, friendRes] = await Promise.all([
        getConversations(null, 100),
        getFriendList(null, 100),
      ]);
      const matched = (convRes?.items || []).find((c) => String(c._id || c.id) === String(id));
      setConversation(matched || null);
      setFriends(friendRes?.items || []);
      if (matched?.preference?.notificationMode) setNotificationMode(matched.preference.notificationMode);

      if (matched && matched.type !== 'group') {
        const directOther = (matched.participants || []).find((p: any) => normalizeId(p) !== currentUserId);
        if (directOther) {
          try {
            const blockedUsers = await getBlockedUsers();
            const blocked = (blockedUsers || []).some(
              (u: any) => normalizeId(u) === normalizeId(directOther),
            );
            setIsDirectBlocked(blocked);
          } catch {
            setIsDirectBlocked(false);
          }
        } else {
          setIsDirectBlocked(false);
        }
      } else {
        setIsDirectBlocked(false);
      }

      await loadConversationAssets(String(id));
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải thông tin cuộc trò chuyện');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, currentUserId, loadConversationAssets]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleAction = async (actionFn: () => Promise<any>, successMessage: string) => {
    try {
      setActionLoading(true);
      await actionFn();
      await loadData();
      Alert.alert('Thành công', successMessage);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectAction = async (fn: () => Promise<any>, successMessage?: string) => {
    try {
      setActionLoading(true);
      await fn();
      await loadData();
      if (successMessage) Alert.alert('Thành công', successMessage);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditor = (titleText: string, defaultValue: string, onSubmit: (value: string) => void) => {
    setEditorTitle(titleText);
    setEditorValue(defaultValue);
    setEditorSubmit(() => onSubmit);
    setEditorVisible(true);
  };

  const toggleGroupSetting = async (payload: GroupSettingsPayload) => {
    if (!conversation) return;
    try {
      setActionLoading(true);
      await updateGroupSettings(conversation._id, payload);
      await loadData();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật cài đặt nhóm');
    } finally {
      setActionLoading(false);
    }
  };

  const changeGroupAvatar = async () => {
    if (!conversation) return;
    if (!canEditGroupInfo) {
      Alert.alert('Không có quyền', 'Bạn không được phép đổi thông tin nhóm.');
      return;
    }
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
      const uploadedUrl = await uploadImageToCloudinary(result.assets[0].uri);
      await updateGroupAvatar(conversation._id, uploadedUrl);
      await loadData();
      Alert.alert('Thành công', 'Đã đổi ảnh nhóm');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đổi ảnh nhóm');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchInvite = async () => {
    if (!conversation) return;
    if (!allowInviteLink) {
      Alert.alert('Chưa bật link mời', 'Hãy bật "Cho phép dùng link tham gia nhóm" trước.');
      return;
    }
    try {
      setInviteLoading(true);
      const data = await getInviteLink(conversation._id);
      setInviteCode(data.inviteCode);
      setInviteWebLink(buildGroupWebInviteLink(data.inviteCode));
      setInviteVisible(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể lấy link mời');
    } finally {
      setInviteLoading(false);
    }
  };

  const resetInvite = async () => {
    if (!inviteCode) return;
    try {
      setInviteLoading(true);
      const data = await resetInviteLink(inviteCode);
      setInviteCode(data.inviteCode);
      setInviteWebLink(buildGroupWebInviteLink(data.inviteCode));
      Alert.alert('Thành công', 'Đã tạo link mới, link cũ đã vô hiệu');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể reset link');
    } finally {
      setInviteLoading(false);
    }
  };

  const handlePromoteOrDemote = (member: any) => {
    if (!conversation || !isOwner) return;
    const uid = normalizeId(member);
    const isMemberAdmin = adminIds.includes(uid);
    if (isMemberAdmin) {
      Alert.alert('Quản lý phó nhóm', `Chọn hành động cho ${member.username}`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hạ quyền',
          onPress: () => handleAction(() => demoteGroupAdmin(conversation._id, uid), 'Đã hạ quyền phó nhóm'),
        },
        {
          text: 'Lên trưởng nhóm',
          style: 'destructive',
          onPress: () =>
            handleAction(
              () => transferGroupOwner(conversation._id, { newOwnerId: uid }),
              'Đã chuyển quyền trưởng nhóm',
            ),
        },
      ]);
      return;
    }
    Alert.alert('Nâng quyền thành viên', `Cấp quyền cho ${member.username}`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Lên phó nhóm',
        onPress: () => handleAction(() => promoteGroupAdmin(conversation._id, uid), 'Đã cấp quyền phó nhóm'),
      },
      {
        text: 'Lên trưởng nhóm',
        style: 'destructive',
        onPress: () =>
          handleAction(
            () => transferGroupOwner(conversation._id, { newOwnerId: uid }),
            'Đã chuyển quyền trưởng nhóm',
          ),
      },
    ]);
  };

  const renderMemberRow = (member: any) => {
    const uid = normalizeId(member);
    const isMe = uid === currentUserId;
    const isMemberOwner = uid === ownerId;
    const isMemberAdmin = adminIds.includes(uid);
    return (
      <View key={uid} style={[styles.memberRow, { borderBottomColor: colors.border }]}>
        <Image
          source={{
            uri:
              member.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}`,
          }}
          style={styles.memberAvatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {member.username || 'Thành viên'} {isMe ? '(Bạn)' : ''}
          </Text>
          <Text
            style={{
              color: isMemberOwner ? '#D97706' : isMemberAdmin ? '#2563EB' : colors.muted,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {isMemberOwner ? 'Trưởng nhóm' : isMemberAdmin ? 'Phó nhóm' : 'Thành viên'}
          </Text>
        </View>
        {isGroup && !isMe && isAdmin && (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isOwner && !isMemberOwner && (
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#E0E7FF' }]}
                onPress={() => handlePromoteOrDemote(member)}
              >
                <Text style={{ color: '#3730A3', fontWeight: '700', fontSize: 11 }}>
                  {isMemberAdmin ? 'Hạ quyền' : 'Nâng quyền'}
                </Text>
              </TouchableOpacity>
            )}
            {isAdmin && !isMemberOwner && (isOwner || !isMemberAdmin) && (
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                onPress={() =>
                  Alert.alert('Mời ra khỏi nhóm?', `Bạn có chắc chắn muốn mời ${member.username} ra khỏi nhóm?`, [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'Mời ra',
                      style: 'destructive',
                      onPress: () =>
                        handleAction(
                          () => removeGroupMember(String(conversation?._id), uid),
                          'Đã mời thành viên ra khỏi nhóm',
                        ),
                    },
                  ])
                }
              >
                <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 11 }}>Mời ra</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.smallBtn, { backgroundColor: '#FEF3C7' }]}
              onPress={() =>
                openEditor('Cập nhật biệt danh', '', (value) =>
                  handleAction(
                    () => updateGroupNickname(String(conversation?._id), uid, value),
                    'Đã cập nhật biệt danh',
                  ),
                )
              }
            >
              <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 11 }}>Biệt danh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const openExternal = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Lỗi', 'Không thể mở liên kết này');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở liên kết này');
    }
  };

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom', 'left', 'right']}
    >
      <Stack.Screen
        options={{ headerTitle: 'Chi tiết cuộc trò chuyện', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }}
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            tintColor={brand}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerProfile}>
          <Image source={{ uri: avatar }} style={styles.mainAvatar} />
          <Text style={[styles.mainTitle, { color: colors.text }]}>{title}</Text>
        </View>

        {!isGroup && (
          <View style={[styles.quickActionsWrap, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() =>
                router.push({ pathname: '/search-messages', params: { id: conversation._id } } as any)
              }
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="search" size={24} color={colors.text} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tìm{'\n'}tin nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                setGroupName('');
                setSelectedGroupMembers(otherUserId ? [otherUserId] : []);
                setCreateGroupVisible(true);
              }}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="people-outline" size={24} color={colors.text} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tạo{'\n'}nhóm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() =>
                handleDirectAction(
                  () => pinConversation(conversation._id, !conversation.preference?.isPinned),
                  conversation.preference?.isPinned
                    ? 'Đã bỏ ghim cuộc trò chuyện'
                    : 'Đã ghim cuộc trò chuyện',
                )
              }
            >
              <View style={styles.quickIconCircle}>
                <Ionicons
                  name={conversation.preference?.isPinned ? 'pin' : 'pin-outline'}
                  size={24}
                  color={colors.text}
                />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                {conversation.preference?.isPinned ? 'Bỏ\nghim' : 'Ghim\nđoạn chat'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={async () => {
                try {
                  const next = conversation.preference?.isMuted ? false : true;
                  await handleDirectAction(
                    () => muteConversation(conversation._id, next),
                    next ? 'Đã tắt thông báo' : 'Đã bật thông báo',
                  );
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông báo');
                }
              }}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons
                  name={conversation.preference?.isMuted ? 'notifications-outline' : 'notifications-off-outline'}
                  size={24}
                  color={colors.text}
                />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                {conversation.preference?.isMuted ? 'Bật\nthông báo' : 'Tắt\nthông báo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isGroup && (
          <View style={[styles.quickActionsWrap, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() =>
                router.push({ pathname: '/search-messages', params: { id: conversation._id } } as any)
              }
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="search" size={24} color={colors.text} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Tìm{'\n'}tin nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                if (!isAdmin) {
                  Alert.alert('Không có quyền', 'Bạn cần là trưởng/phó nhóm để thêm thành viên.');
                  return;
                }
                setSelectedMembersToAdd([]);
                setAddMembersVisible(true);
              }}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons name="person-add-outline" size={24} color={colors.text} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>Thêm{'\n'}thành viên</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() =>
                handleDirectAction(
                  () => pinConversation(conversation._id, !conversation.preference?.isPinned),
                  conversation.preference?.isPinned ? 'Đã bỏ ghim nhóm' : 'Đã ghim nhóm',
                )
              }
            >
              <View style={styles.quickIconCircle}>
                <Ionicons
                  name={conversation.preference?.isPinned ? 'pin' : 'pin-outline'}
                  size={24}
                  color={colors.text}
                />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                {conversation.preference?.isPinned ? 'Bỏ\nghim nhóm' : 'Ghim\nnhóm'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={async () => {
                try {
                  const next = notificationMode === 'mute' ? 'all' : 'mute';
                  setNotificationMode(next);
                  await updateConversationPreference(conversation._id, { notificationMode: next });
                  await loadData();
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể cập nhật thông báo');
                }
              }}
            >
              <View style={styles.quickIconCircle}>
                <Ionicons
                  name={notificationMode === 'mute' ? 'notifications-outline' : 'notifications-off-outline'}
                  size={24}
                  color={colors.text}
                />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                {notificationMode === 'mute' ? 'Bật\nthông báo' : 'Tắt\nthông báo'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isGroup && (
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              disabled={!canEditGroupInfo}
              onPress={() => {
                if (!canEditGroupInfo) {
                  Alert.alert('Không có quyền', 'Bạn không được phép đổi tên nhóm.');
                  return;
                }
                openEditor('Đổi tên nhóm', conversation.name || '', (value) =>
                  handleAction(() => updateGroupName(conversation._id, value), 'Đã đổi tên nhóm'),
                );
              }}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="pencil" size={24} color="#4F46E5" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Đổi tên</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              disabled={!canEditGroupInfo}
              onPress={changeGroupAvatar}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
                <Ionicons name="image" size={24} color="#9333EA" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Đổi ảnh</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() =>
                router.push({ pathname: '/pinned-messages', params: { id: conversation._id } } as any)
              }
            >
              <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="pin-outline" size={24} color="#1D4ED8" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Tin nhắn đã ghim</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.push({ pathname: '/reminders', params: { id: conversation._id } } as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="calendar-outline" size={24} color="#047857" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Nhắc hẹn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.push({ pathname: '/create-poll', params: { conversationId: conversation._id } } as any)}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="stats-chart-outline" size={24} color="#B91C1C" />
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Bình chọn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gridBtn, { backgroundColor: colors.surface }]}
              disabled={inviteLoading}
              onPress={fetchInvite}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#92400E" />
                ) : (
                  <Ionicons name="link-outline" size={24} color="#92400E" />
                )}
              </View>
              <Text style={[styles.gridBtnText, { color: colors.text }]}>Link mời</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Nội dung đã chia sẻ</Text>

          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.assetTitle, { color: colors.text }]}>Ảnh và video</Text>
            {assetsLoading ? (
              <ActivityIndicator size="small" color={brand} style={{ marginTop: 8 }} />
            ) : imageVideoAssets.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>Chưa có ảnh/video trong cuộc trò chuyện.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8 }}>
                {imageVideoAssets.slice(0, 12).map((media) => {
                  const isVideo = media.mimeType?.startsWith('video/');
                  return (
                    <TouchableOpacity
                      key={media._id || media.id}
                      style={styles.mediaThumbWrap}
                      onPress={() => openExternal(media.url)}
                    >
                      <Image source={{ uri: media.url }} style={styles.mediaThumb} />
                      {isVideo && (
                        <View style={styles.videoBadge}>
                          <Ionicons name="play" size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          <View style={{ marginBottom: 14 }}>
            <Text style={[styles.assetTitle, { color: colors.text }]}>Liên kết</Text>
            {assetsLoading ? (
              <ActivityIndicator size="small" color={brand} style={{ marginTop: 8 }} />
            ) : linkAssets.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>Chưa có liên kết trong cuộc trò chuyện.</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                {linkAssets.slice(0, 8).map((link) => (
                  <TouchableOpacity
                    key={link}
                    style={[styles.assetRow, { borderBottomColor: colors.border }]}
                    onPress={() => openExternal(link)}
                  >
                    <Ionicons name="link-outline" size={18} color={brand} style={{ marginRight: 8 }} />
                    <Text numberOfLines={1} style={{ color: colors.text, flex: 1 }}>
                      {link}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View>
            <Text style={[styles.assetTitle, { color: colors.text }]}>Tệp</Text>
            {assetsLoading ? (
              <ActivityIndicator size="small" color={brand} style={{ marginTop: 8 }} />
            ) : fileAssets.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>Chưa có tệp trong cuộc trò chuyện.</Text>
            ) : (
              <View style={{ marginTop: 8 }}>
                {fileAssets.slice(0, 8).map((file) => (
                  <TouchableOpacity
                    key={file._id || file.id}
                    style={[styles.assetRow, { borderBottomColor: colors.border }]}
                    onPress={() => openExternal(file.url)}
                  >
                    <Ionicons name="document-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>
                        {file.fileName || 'Tệp đính kèm'}
                      </Text>
                      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                        {file.mimeType || 'application/octet-stream'} • {formatFileSize(file.size)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {!isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() =>
                openEditor('Đặt tên gợi nhớ', conversation.preference?.nickname || '', (value) =>
                  handleDirectAction(
                    () =>
                      updateConversationPreference(conversation._id, {
                        nickname: value.trim() ? value.trim() : null,
                      }),
                    'Đã cập nhật tên gợi nhớ',
                  ),
                )
              }
            >
              <Ionicons name="person-outline" size={22} color={colors.text} style={{ width: 28 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                {conversation.preference?.nickname
                  ? `Tên gợi nhớ: ${conversation.preference.nickname}`
                  : 'Đặt tên gợi nhớ'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                if (!otherUserId) return;
                handleDirectAction(
                  () => blockOrUnblockUser(otherUserId, isDirectBlocked ? 'unblock' : 'block'),
                  isDirectBlocked ? 'Đã bỏ chặn người dùng' : 'Đã chặn người dùng',
                );
              }}
            >
              <Ionicons name="ban-outline" size={22} color={colors.text} style={{ width: 28 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                {isDirectBlocked ? 'Bỏ chặn người này' : 'Chặn người này'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setReportVisible(true)}
            >
              <Ionicons name="flag-outline" size={22} color="#F59E0B" style={{ width: 28 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>Báo cáo</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() =>
                Alert.alert('Ẩn cuộc trò chuyện?', 'Cuộc trò chuyện sẽ được đưa vào mục lưu trữ.', [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Ẩn',
                    style: 'destructive',
                    onPress: () =>
                      handleDirectAction(
                        () => updateConversationPreference(conversation._id, { isHidden: true }),
                        'Đã ẩn cuộc trò chuyện',
                      ).then(() => router.replace('/(tabs)')),
                  },
                ])
              }
            >
              <Ionicons name="archive-outline" size={22} color="#EF4444" style={{ width: 28 }} />
              <Text style={{ color: '#EF4444', fontSize: 16, fontWeight: '700', flex: 1 }}>
                Ẩn cuộc trò chuyện
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.optionItem} onPress={() => setMembersVisible(true)}>
              <Ionicons name="people-outline" size={22} color={colors.text} style={{ width: 28 }} />
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                Xem thành viên ({conversation.participants?.length || 0})
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionItem, !isAdmin && { opacity: 0.5 }]}
              disabled={!isAdmin}
              onPress={() =>
                router.push({ pathname: '/join-requests', params: { id: conversation._id } } as any)
              }
            >
              <Ionicons name="person-add-outline" size={22} color={isAdmin ? colors.text : colors.muted} style={{ width: 28 }} />
              <Text style={{ color: isAdmin ? colors.text : colors.muted, fontSize: 16, fontWeight: '600', flex: 1 }}>
                Duyệt thành viên mới
              </Text>
              <Ionicons name="chevron-forward" size={20} color={isAdmin ? colors.muted : '#D1D5DB'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionItem, !isAdmin && { opacity: 0.5 }]}
              disabled={!isAdmin}
              onPress={() =>
                router.push({ pathname: '/blocked-members', params: { id: conversation._id } } as any)
              }
            >
              <Ionicons name="ban-outline" size={22} color={isAdmin ? colors.text : colors.muted} style={{ width: 28 }} />
              <Text style={{ color: isAdmin ? colors.text : colors.muted, fontSize: 16, fontWeight: '600', flex: 1 }}>
                Chặn khỏi nhóm
              </Text>
              <Ionicons name="chevron-forward" size={20} color={isAdmin ? colors.muted : '#D1D5DB'} />
            </TouchableOpacity>
          </View>
        )}

        {isGroup && isAdmin && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>
              Cho phép các thành viên trong nhóm:
            </Text>
            {MEMBER_PERMISSION_ITEMS.map((item) => {
              const value = (conversation.settings as any)?.[item.key] !== false;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.optionItem, { justifyContent: 'space-between' }]}
                  onPress={() => toggleGroupSetting({ [item.key]: !value })}
                >
                  <Text style={{ color: colors.text, fontSize: 15, flex: 1, paddingRight: 8 }}>
                    {item.label}
                  </Text>
                  <Ionicons
                    name={value ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={value ? brand : colors.muted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {isGroup && isAdmin && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 12 }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>Cài đặt nhóm:</Text>
            {GROUP_TOGGLE_ITEMS.map((item) => {
              const value =
                item.key === 'isApprovalRequired'
                  ? !!(conversation.settings as any)?.[item.key]
                  : (conversation.settings as any)?.[item.key] !== false;
              return (
                <View key={item.key} style={[styles.optionItem, { justifyContent: 'space-between' }]}>
                  <Text style={{ color: colors.text, fontSize: 15, flex: 1, paddingRight: 8 }}>
                    {item.label}
                  </Text>
                  <Switch
                    value={value}
                    onValueChange={(v) => toggleGroupSetting({ [item.key]: v })}
                    trackColor={{ false: '#D1D5DB', true: `${brand}80` }}
                    thumbColor={value ? brand : '#F3F4F6'}
                  />
                </View>
              );
            })}
          </View>
        )}

        {isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 16 }]}>
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => {
                if (isOwner && (conversation.participants?.length || 0) > 1) {
                  Alert.alert(
                    'Lưu ý',
                    'Bạn là trưởng nhóm. Hãy chuyển quyền cho thành viên khác trước khi rời nhóm.',
                  );
                  return;
                }
                Alert.alert('Rời nhóm?', 'Bạn có chắc chắn muốn rời nhóm này?', [
                  { text: 'Hủy', style: 'cancel' },
                  {
                    text: 'Rời nhóm',
                    style: 'destructive',
                    onPress: () =>
                      handleAction(() => leaveGroup(conversation._id), 'Đã rời nhóm').then(() =>
                        router.replace('/(tabs)'),
                      ),
                  },
                ]);
              }}
            >
              <Ionicons name="exit-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerBtnText}>Rời nhóm</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() =>
                  Alert.alert('Giải tán nhóm?', 'Hành động này sẽ xóa nhóm và không thể hoàn tác.', [
                    { text: 'Hủy', style: 'cancel' },
                    {
                      text: 'Giải tán',
                      style: 'destructive',
                      onPress: () =>
                        handleAction(() => disbandGroup(conversation._id), 'Đã giải tán nhóm').then(
                          () => router.replace('/(tabs)'),
                        ),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
                <Text style={styles.dangerBtnText}>Giải tán nhóm</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* {!isGroup && (
          <View style={[styles.section, { backgroundColor: colors.surface, marginTop: 16 }]}>
            <Text style={[styles.sectionTitle, { color: colors.muted }]}>Quản lý thành viên:</Text>
            {isAdmin && (
              <>
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => setMembersVisible(true)}
                >
                  <Ionicons name="people-outline" size={22} color={colors.text} style={{ width: 28 }} />
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 }}>
                    Xem thành viên
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )} */}
      </ScrollView>

      <Modal visible={addMembersVisible} animationType="slide" onRequestClose={() => setAddMembersVisible(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAddMembersVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Thêm thành viên</Text>
            <TouchableOpacity
              disabled={actionLoading || selectedMembersToAdd.length === 0}
              onPress={async () => {
                try {
                  setActionLoading(true);
                  await addGroupMembers(conversation._id, selectedMembersToAdd);
                  setAddMembersVisible(false);
                  await loadData();
                } catch (error: any) {
                  Alert.alert('Lỗi', error.message || 'Không thể thêm thành viên');
                } finally {
                  setActionLoading(false);
                }
              }}
            >
              <Text style={{ color: selectedMembersToAdd.length > 0 ? brand : colors.muted, fontWeight: '700' }}>
                Xong
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {friends.map((friend) => {
              const fid = normalizeId(friend);
              const isMember = (conversation.participants || []).some(
                (member: any) => normalizeId(member) === fid,
              );
              if (isMember) return null;
              const checked = selectedMembersToAdd.includes(fid);
              return (
                <TouchableOpacity
                  key={fid}
                  style={[styles.memberRow, { borderBottomColor: colors.border }]}
                  onPress={() =>
                    setSelectedMembersToAdd((prev) =>
                      checked ? prev.filter((x) => x !== fid) : [...prev, fid],
                    )
                  }
                >
                  <Image
                    source={{
                      uri:
                        friend.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username || 'U')}`,
                    }}
                    style={styles.memberAvatar}
                  />
                  <Text style={{ color: colors.text, flex: 1 }}>{friend.username}</Text>
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={checked ? brand : colors.muted}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={membersVisible} animationType="slide" onRequestClose={() => setMembersVisible(false)}>
        <View style={[styles.fullModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setMembersVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
              Thành viên ({conversation.participants?.length || 0})
            </Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView>{(conversation.participants || []).map(renderMemberRow)}</ScrollView>
        </View>
      </Modal>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.editorOverlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 10 }}>
              {editorTitle}
            </Text>
            <TextInput
              style={[styles.editorInput, { borderColor: colors.border, color: colors.text }]}
              value={editorValue}
              onChangeText={setEditorValue}
              autoFocus
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setEditorVisible(false)}
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (editorSubmit) editorSubmit(editorValue);
                  setEditorVisible(false);
                }}
                style={[styles.modalBtn, { backgroundColor: brand }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={inviteVisible} transparent animationType="fade" onRequestClose={() => setInviteVisible(false)}>
        <TouchableOpacity style={styles.editorOverlay} activeOpacity={1} onPress={() => setInviteVisible(false)}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>
              Link mời tham gia nhóm
            </Text>
            <Text style={{ color: colors.text, marginBottom: 12 }}>{inviteWebLink || 'Đang tải...'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
                onPress={() => {
                  Clipboard.setString(inviteWebLink || '');
                  Alert.alert('Thành công', 'Đã sao chép link mời');
                }}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>Sao chép</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#DBEAFE' }]}
                onPress={() => Share.share({ message: inviteWebLink })}
              >
                <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Chia sẻ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#FEF3C7' }]}
                onPress={resetInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator size="small" color="#92400E" />
                ) : (
                  <Text style={{ color: '#92400E', fontWeight: '700' }}>Đặt lại link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={reportVisible} transparent animationType="fade" onRequestClose={() => setReportVisible(false)}>
        <View style={styles.editorOverlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>
              Báo cáo lý do
            </Text>
            <ScrollView style={{ maxHeight: 300, marginBottom: 12 }} showsVerticalScrollIndicator={false}>
              {[
                { label: 'Vi phạm quy tắc cộng đồng', value: 'community_violation' },
                { label: 'Spam hoặc lạm dụng', value: 'spam' },
                { label: 'Nội dung không phù hợp', value: 'inappropriate_content' },
                { label: 'Tấn công hoặc lăng mạ', value: 'harassment' },
                { label: 'Gian lận hoặc lừa đảo', value: 'fraud' },
              ].map((reason) => (
                <TouchableOpacity
                  key={reason.value}
                  style={[styles.optionItem, { paddingVertical: 12 }]}
                  onPress={() => {
                    setReportReason(reason.value);
                  }}
                >
                  <Ionicons
                    name={reportReason === reason.value ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={reportReason === reason.value ? brand : colors.muted}
                    style={{ width: 28 }}
                  />
                  <Text style={{ color: colors.text, fontSize: 16, flex: 1 }}>
                    {reason.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              Mô tả thêm (tùy chọn)
            </Text>
            <TextInput
              style={[
                styles.editorInput,
                { borderColor: colors.border, color: colors.text, minHeight: 80, textAlignVertical: 'top' },
              ]}
              placeholder="Nhập mô tả..."
              placeholderTextColor={colors.muted}
              value={reportDescription}
              onChangeText={setReportDescription}
              multiline
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  setReportVisible(false);
                  setReportReason('');
                  setReportDescription('');
                }}
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!reportReason || actionLoading}
                onPress={async () => {
                  try {
                    setActionLoading(true);
                    const reportMessage = reportDescription
                      ? `${reportReason}: ${reportDescription}`
                      : reportReason;
                    if (!isGroup && otherUserId) {
                      await reportUser(otherUserId, reportMessage);
                    } else {
                      await reportConversation(conversation._id, reportMessage);
                    }
                    setReportVisible(false);
                    setReportReason('');
                    setReportDescription('');
                    Alert.alert('Thành công', 'Đã gửi báo cáo');
                  } catch (error: any) {
                    Alert.alert('Lỗi', error.message || 'Không thể gửi báo cáo');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                style={[
                  styles.modalBtn,
                  { backgroundColor: reportReason ? brand : '#D1D5DB' },
                ]}
              >
                <Text style={{ color: reportReason ? '#fff' : '#9CA3AF', fontWeight: '700' }}>
                  Báo cáo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={createGroupVisible} transparent animationType="fade" onRequestClose={() => setCreateGroupVisible(false)}>
        <View style={styles.editorOverlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 12 }}>
              Tạo nhóm mới
            </Text>
            <TextInput
              style={[styles.editorInput, { borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
              placeholder="Nhập tên nhóm..."
              placeholderTextColor={colors.muted}
              value={groupName}
              onChangeText={setGroupName}
              autoFocus
            />
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 10 }}>
              Thành viên ({selectedGroupMembers.length + 1}/tối thiểu 3)
            </Text>
            
            {selectedGroupMembers.length + 1 < 3 && (
              <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: '#991B1B', fontSize: 13, fontWeight: '600' }}>
                  ⚠️ Vui lòng chọn ít nhất {3 - selectedGroupMembers.length - 1} thành viên khác
                </Text>
              </View>
            )}

            <View style={{ maxHeight: 200, marginBottom: 12 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                  <Ionicons name="checkmark-circle" size={20} color={brand} style={{ marginRight: 10, width: 24 }} />
                  <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>
                    {(otherParticipant as any)?.username || 'Người dùng'}
                  </Text>
                </View>

                {friends
                  .filter((f) => normalizeId(f) !== otherUserId)
                  .map((friend) => {
                    const fid = normalizeId(friend);
                    const isSelected = selectedGroupMembers.includes(fid);
                    return (
                      <TouchableOpacity
                        key={fid}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 8,
                          backgroundColor: isSelected ? `${brand}15` : 'transparent',
                        }}
                        onPress={() => {
                          setSelectedGroupMembers((prev) =>
                            isSelected ? prev.filter((x) => x !== fid) : [...prev, fid],
                          );
                        }}
                      >
                        <Ionicons
                          name={isSelected ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={isSelected ? brand : colors.muted}
                          style={{ marginRight: 10, width: 24 }}
                        />
                        <Image
                          source={{
                            uri:
                              friend.avatarUrl ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                friend.username || 'U',
                              )}`,
                          }}
                          style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                        />
                        <Text style={{ color: colors.text, flex: 1, fontWeight: isSelected ? '600' : '500' }}>
                          {friend.username}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  setCreateGroupVisible(false);
                  setGroupName('');
                  setSelectedGroupMembers([]);
                }}
                style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}
              >
                <Text style={{ color: '#111827', fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={
                  !groupName.trim() ||
                  selectedGroupMembers.length + 1 < 3 ||
                  actionLoading
                }
                onPress={async () => {
                  if (selectedGroupMembers.length + 1 < 3) {
                    Alert.alert('Lỗi', `Vui lòng chọn ít nhất 3 thành viên (hiện tại: ${selectedGroupMembers.length + 1})`);
                    return;
                  }
                  try {
                    setActionLoading(true);
                    const participantIds = [currentUserId, ...selectedGroupMembers];
                    const newConversation = await createConversation({
                      type: 'group',
                      name: groupName.trim(),
                      participantIds,
                    });
                    setCreateGroupVisible(false);
                    setGroupName('');
                    setSelectedGroupMembers([]);
                    Alert.alert('Thành công', 'Nhóm đã được tạo');
                    router.push({
                      pathname: '/(chat-info)/conversation-details',
                      params: { id: newConversation._id || newConversation.id },
                    } as any);
                  } catch (error: any) {
                    Alert.alert('Lỗi', error.message || 'Không thể tạo nhóm');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor:
                      groupName.trim() && selectedGroupMembers.length + 1 >= 3
                        ? brand
                        : '#D1D5DB',
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      groupName.trim() && selectedGroupMembers.length + 1 >= 3
                        ? '#fff'
                        : '#9CA3AF',
                    fontWeight: '700',
                  }}
                >
                  Tạo nhóm
                </Text>
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
  mainAvatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12 },
  mainTitle: { fontSize: 22, fontWeight: '700' },
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
  quickActionLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },
  section: {
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  actionGrid: { marginHorizontal: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridBtn: { width: '31%', alignItems: 'center', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8 },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridBtnText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
  smallBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dangerBtnText: { color: '#EF4444', fontWeight: '700' },
  fullModal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  editorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  editorCard: { borderRadius: 14, padding: 14 },
  editorInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  assetTitle: { fontSize: 14, fontWeight: '700' },
  mediaThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  mediaThumb: { width: '100%', height: '100%' },
  videoBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
