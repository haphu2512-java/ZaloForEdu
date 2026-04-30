import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ExpoContacts from 'expo-contacts';
import {
  StyleSheet,
  SectionList,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  View as RNView,
  Modal,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';
import {
  createConversation,
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
} from '@/utils/messageService';
import {
  getFriendList,
  sendFriendRequest,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequestsBulk,
} from '@/utils/friendService';
import { searchUsers } from '@/utils/searchService';
import {
  computeSmartSuggestions,
  lookupUsersByPhones,
  normalizeVietnamPhone,
  parseQrPayloadToUserId,
} from '@/utils/friendDiscoveryService';
import { blockOrUnblockUser } from '@/utils/userService';
import { getUserById } from '@/utils/userService';
import type { UserInfo, Conversation } from '@/types/chat';
import type { FriendRequest } from '@/types/friend';
import CreateGroupModal from '@/components/contacts/CreateGroupModal';
import FriendRequestsModal from '@/components/contacts/FriendRequestsModal';
import GroupManageModal from '@/components/contacts/GroupManageModal';
import SuggestionUserRow from '@/components/contacts/SuggestionUserRow';
import PhoneFriendModal from '@/components/contacts/PhoneFriendModal';
import ContactSyncModal from '@/components/contacts/ContactSyncModal';
import QrFriendModal from '@/components/contacts/QrFriendModal';

type ContactTab = 'friends' | 'groups' | 'oa';
type FilterTab = 'all' | 'recent';

export default function ContactsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, setUser } = useAuth();
  const router = useRouter();

  const brand = colors.tint;
  const headerBg = colorScheme === 'dark' ? colors.surface : brand;
  const searchSurface = colorScheme === 'dark' ? colors.background : 'rgba(255,255,255,0.20)';

  const [activeTab, setActiveTab] = useState<ContactTab>('friends');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [syncedContactMatches, setSyncedContactMatches] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneResult, setPhoneResult] = useState<UserInfo | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [findingPhone, setFindingPhone] = useState(false);
  const [deviceContactsCount, setDeviceContactsCount] = useState(0);
  const [qrInput, setQrInput] = useState('');
  const [qrPreviewUser, setQrPreviewUser] = useState<UserInfo | null>(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [syncModalVisible, setSyncModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [createGroupVisible, setCreateGroupVisible] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [groupManageVisible, setGroupManageVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Conversation | null>(null);
  const [addMembersVisible, setAddMembersVisible] = useState(false);
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);
  const [sentFriendRequestIds, setSentFriendRequestIds] = useState<string[]>([]);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorPlaceholder, setEditorPlaceholder] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [editorSubmit, setEditorSubmit] = useState<null | ((value: string) => void)>(null);

  const getUserId = useCallback((u: UserInfo) => u._id || u.id || '', []);

  const loadContacts = useCallback(async () => {
    // Don't fetch if user is not logged in
    if (!user) {
      console.log('[Contacts] User not logged in, skipping fetch');
      return;
    }
    
    try {
      const [friendsRes, incomingRes, outgoingRes, conversationsRes] = await Promise.all([
        getFriendList(null, 100),
        getIncomingFriendRequests(null, 100),
        getOutgoingFriendRequests(null, 100),
        getConversations(null, 100),
      ]);
      setFriends(friendsRes?.items || []);
      setIncomingRequests(incomingRes?.items || []);
      setOutgoingRequests(outgoingRes?.items || []);
      const outgoingIds = (outgoingRes?.items || [])
        .map((request) =>
          typeof request.toUserId === 'string'
            ? request.toUserId
            : request.toUserId?._id || request.toUserId?.id || '',
        )
        .filter(Boolean);
      setSentFriendRequestIds(Array.from(new Set(outgoingIds)));
      const myGroups = (conversationsRes?.items || []).filter((conv) => conv.type === 'group');
      setGroups(myGroups);
    } catch (error: any) {
      console.log('Failed to fetch contacts:', error.message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const init = async () => {
        // Only show loading if user is logged in
        if (user && friends.length === 0 && groups.length === 0) setLoading(true);
        await loadContacts();
        if (isActive) setLoading(false);
      };
      init();
      return () => {
        isActive = false;
      };
    }, [loadContacts, user, friends.length, groups.length])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContacts();
    setRefreshing(false);
  }, [loadContacts]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchUsers(searchQuery.trim(), null, 20);
        const filtered = (res?.items || []).filter((u) => getUserId(u) && getUserId(u) !== user?.id);
        const deduped = Array.from(new Map(filtered.map((u) => [getUserId(u), u])).values());
        setSearchResults(deduped);
      } catch (error: any) {
        console.log('Search failed:', error.message);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery, user?.id, getUserId]);

  const handleAddFriend = async (targetUserId: string) => {
    if (!targetUserId) {
      Alert.alert('Lỗi', 'Không xác định được người dùng để kết bạn');
      return;
    }

    try {
      await sendFriendRequest({ toUserId: targetUserId });
      setSentFriendRequestIds((prev) =>
        prev.includes(targetUserId) ? prev : [...prev, targetUserId],
      );
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      await loadContacts();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi lời mời');
    }
  };

  const handleToggleBlock = async (targetUserId: string) => {
    if (!targetUserId || !user) return;
    const isBlocked = (user.blockedUsers || []).includes(targetUserId);
    const action = isBlocked ? 'unblock' : 'block';
    try {
      const result = await blockOrUnblockUser(targetUserId, action);
      setUser((prev: any) => (prev ? { ...prev, blockedUsers: result.blockedUsers || [] } : prev));
      Alert.alert(
        'Thành công',
        action === 'block' ? 'Đã chặn người dùng' : 'Đã bỏ chặn người dùng',
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật trạng thái chặn');
    }
  };

  const getRequestSender = (request: FriendRequest): UserInfo | null => {
    const sender = request.fromUserId;
    if (!sender || typeof sender === 'string') return null;
    return sender;
  };

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setProcessingRequestId(requestId);
    try {
      if (action === 'accept') {
        await acceptFriendRequest(requestId);
      } else {
        await rejectFriendRequest(requestId);
      }
      await loadContacts();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể xử lý lời mời');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const isFriend = (userId: string) => friends.some((f) => getUserId(f) === userId);

  const handleStartChat = async (userId: string) => {
    try {
      const conv = await createConversation({
        type: 'direct',
        participantIds: [userId]
      });
      // Handle the case where _id might be id depending on the backend response
      const convId = conv._id || conv.id;
      router.push(`/chat/${convId}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo cuộc trò chuyện');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!friendId) return;
    Alert.alert('Xóa bạn', 'Bạn có chắc muốn xóa người bạn này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(friendId);
            await loadContacts();
            Alert.alert('Thành công', 'Đã xóa bạn');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể xóa bạn');
          }
        },
      },
    ]);
  };

  const handleFindByPhone = async () => {
    const normalizedPhone = normalizeVietnamPhone(phoneSearch);
    if (!normalizedPhone) {
      Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
      return;
    }

    setFindingPhone(true);
    try {
      const res = await searchUsers(normalizedPhone, null, 5);
      const matched =
        (res?.items || []).find((item) => {
          const normalized = normalizeVietnamPhone(item.phone || '');
          return normalized === normalizedPhone && getUserId(item) !== user?.id;
        }) || null;
      setPhoneResult(matched);
      if (!matched) Alert.alert('Không tìm thấy', 'Chưa có tài khoản nào khớp số điện thoại này.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tìm theo số điện thoại');
    } finally {
      setFindingPhone(false);
    }
  };

  const handleSyncContacts = async () => {
    setSyncingContacts(true);
    try {
      const { status } = await ExpoContacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Thiếu quyền truy cập', 'Bạn cần cấp quyền Danh bạ để đồng bộ.');
        return;
      }

      const allPhones = new Set<string>();
      let pageOffset = 0;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await ExpoContacts.getContactsAsync({
          fields: [ExpoContacts.Fields.PhoneNumbers],
          pageSize: 200,
          pageOffset,
        });

        for (const contact of response.data || []) {
          for (const phoneItem of contact.phoneNumbers || []) {
            const normalized = normalizeVietnamPhone(phoneItem.number || '');
            if (normalized) allPhones.add(normalized);
          }
        }

        hasNextPage = !!response.hasNextPage;
        pageOffset += 200;
      }

      const phones = Array.from(allPhones).slice(0, 300);
      setDeviceContactsCount(phones.length);
      if (phones.length === 0) {
        Alert.alert('Không có dữ liệu', 'Danh bạ của bạn chưa có số điện thoại hợp lệ.');
        return;
      }

      const foundUsers = await lookupUsersByPhones(phones);
      const filtered = foundUsers.filter((u) => {
        const uid = getUserId(u);
        return uid && uid !== user?.id && !isFriend(uid);
      });
      setSyncedContactMatches(filtered);
      Alert.alert('Đồng bộ xong', `Đã quét ${phones.length} số, tìm thấy ${filtered.length} liên hệ đang dùng ứng dụng.`);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đồng bộ danh bạ');
    } finally {
      setSyncingContacts(false);
    }
  };

  const mapApiUser = (raw: any): UserInfo => ({
    _id: raw?._id || raw?.id,
    id: raw?.id || raw?._id,
    username: raw?.username || 'Người dùng',
    email: raw?.email,
    phone: raw?.phone,
    avatarUrl: raw?.avatarUrl,
    isOnline: raw?.isOnline,
    lastSeen: raw?.lastSeen,
  });

  const handleResolveQr = async () => {
    const userId = parseQrPayloadToUserId(qrInput);
    if (!userId) {
      Alert.alert('Mã QR không hợp lệ', 'Vui lòng nhập lại mã QR hoặc user ID.');
      return;
    }

    try {
      const found = await getUserById(userId);
      const normalizedUser = mapApiUser(found);
      if (getUserId(normalizedUser) === user?.id) {
        Alert.alert('Thông báo', 'Đây là mã QR của chính bạn.');
        return;
      }
      setQrPreviewUser(normalizedUser);
    } catch (error: any) {
      Alert.alert('Không tìm thấy', error.message || 'Mã QR này không tồn tại.');
      setQrPreviewUser(null);
    }
  };

  const handleSendBulkFromSuggestions = async () => {
    if (smartSuggestions.length === 0) {
      Alert.alert('Thông báo', 'Hiện chưa có gợi ý mới.');
      return;
    }
    const topSuggestionIds = smartSuggestions
      .slice(0, 5)
      .map((item) => getUserId(item))
      .filter(Boolean);

    try {
      const result = await sendFriendRequestsBulk(topSuggestionIds);
      if (result.successIds.length > 0) {
        setSentFriendRequestIds((prev) => Array.from(new Set([...prev, ...result.successIds])));
        Alert.alert('Đã gửi lời mời', `Gửi thành công ${result.successIds.length} lời mời.`);
        await loadContacts();
        return;
      }
      Alert.alert('Thông báo', 'Chưa gửi được lời mời nào. Có thể bạn đã gửi trước đó.');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lời mời hàng loạt');
    }
  };

  const filteredFriends = useMemo(() => {
    if (activeFilter === 'all') return friends;
    return friends.filter((f) => !!f.isOnline);
  }, [friends, activeFilter]);

  const smartSuggestions = useMemo(
    () =>
      computeSmartSuggestions({
        currentUserId: user?.id || '',
        friends,
        groups,
        incomingRequests,
        outgoingRequests,
        syncedContactMatches,
      }),
    [friends, groups, incomingRequests, outgoingRequests, syncedContactMatches, user?.id],
  );

  const friendSections = useMemo(() => {
    const sorted = [...filteredFriends].sort((a, b) =>
      (a.username || '').localeCompare(b.username || '', 'vi', { sensitivity: 'base' }),
    );

    const map = new Map<string, UserInfo[]>();
    for (const item of sorted) {
      const letter = (item.username || '#').trim().charAt(0).toUpperCase() || '#';
      const key = /[A-ZÀ-Ỹ]/.test(letter) ? letter : '#';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(item);
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredFriends]);

  const getConversationUserId = useCallback((value: string | UserInfo | undefined) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.id || '';
  }, []);

  const openManageGroup = (group: Conversation) => {
    router.push({ pathname: '/conversation-details', params: { id: group._id } });
  };

  const toggleMemberSelection = (friendId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const toggleAddMemberSelection = (friendId: string) => {
    setSelectedMembersToAdd((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupNameInput.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedGroupMembers.length < 2) {
      Alert.alert('Thiếu thành viên', 'Nhóm cần ít nhất 3 người (bao gồm bạn)');
      return;
    }
    try {
      setGroupActionLoading(true);
      await createConversation({
        type: 'group',
        name: groupNameInput.trim(),
        participantIds: selectedGroupMembers,
      });
      setCreateGroupVisible(false);
      setGroupNameInput('');
      setSelectedGroupMembers([]);
      await loadContacts();
      Alert.alert('Thành công', 'Đã tạo nhóm mới');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo nhóm');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleGroupAction = async (action: () => Promise<any>, successMessage: string) => {
    try {
      setGroupActionLoading(true);
      const res = await action();
      if (res && (res._id || res.id) && selectedGroup && (selectedGroup._id === res._id || selectedGroup.id === res.id)) {
        setSelectedGroup((prev) => prev ? { ...prev, ...res } : res);
      }
      await loadContacts();
      Alert.alert('Thành công', successMessage);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật nhóm');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const currentUserId = user?.id || '';

  const openTextEditor = (
    title: string,
    placeholder: string,
    onSubmit: (value: string) => void,
    defaultValue: string = '',
  ) => {
    setEditorTitle(title);
    setEditorPlaceholder(placeholder);
    setEditorValue(defaultValue);
    setEditorSubmit(() => onSubmit);
    setEditorVisible(true);
  };

  const renderSearchUserItem = ({ item }: { item: UserInfo }) => {
    const uid = getUserId(item);
    const isBlocked = (user?.blockedUsers || []).includes(uid);
    const isRequestSent = sentFriendRequestIds.includes(uid);
    const alreadyFriend = isFriend(uid);
    return (
      <View style={[styles.userRow, { backgroundColor: colors.surface }]}>
        <Image
          source={{
            uri:
              item.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=0EA5E9&color=fff&size=100&bold=true`,
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.username}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>{item.email || item.phone || 'Người dùng'}</Text>
          {!alreadyFriend && (
            <Text style={{ fontSize: 11, color: colors.muted, fontStyle: 'italic', marginTop: 2 }}>Chưa kết bạn</Text>
          )}
        </View>
        <View style={{ gap: 6, backgroundColor: 'transparent' }}>
          {/* Nút Nhắn tin - luôn hiển thị cho mọi user (kể cả người lạ) */}
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#0EA5E9' }]}
            onPress={() => handleStartChat(uid)}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Nhắn tin</Text>
          </TouchableOpacity>
          {!alreadyFriend ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: isRequestSent ? '#9CA3AF' : brand }]}
                onPress={() => handleAddFriend(uid)}
                disabled={isRequestSent}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  {isRequestSent ? 'Đã gửi' : 'Kết bạn'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: isBlocked ? '#16A34A' : '#DC2626' }]}
                onPress={() => handleToggleBlock(uid)}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                  {isBlocked ? 'Bỏ chặn' : 'Chặn'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
              <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Bạn bè ✓</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFriendItem = ({ item }: { item: UserInfo }) => (
    <TouchableOpacity
      style={[styles.userRow, { backgroundColor: colors.surface }]}
      onPress={() => handleStartChat(getUserId(item))}
      onLongPress={() => handleRemoveFriend(getUserId(item))}
    >
      <Image
        source={{
          uri:
            item.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=2563EB&color=fff&size=100&bold=true`,
        }}
        style={styles.avatar}
      />
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Text style={[styles.userName, { color: colors.text }]}>{item.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => Alert.alert('Thông báo', 'Chức năng gọi thoại sẽ được cập nhật sớm')}
      >
        <Ionicons name="call-outline" size={22} color={colors.muted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={() => Alert.alert('Thông báo', 'Chức năng gọi video sẽ được cập nhật sớm')}
      >
        <Ionicons name="videocam-outline" size={22} color={colors.muted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item }: { item: Conversation }) => {
    const ownerId = getConversationUserId(item.ownerId) || item.createdBy;
    const adminIds = (item.adminIds || []).map((admin) => getConversationUserId(admin));
    const isOwner = ownerId === currentUserId;
    const isAdmin = isOwner || adminIds.includes(currentUserId);
    const memberCount = item.participants?.length || 0;

    return (
      <TouchableOpacity
        style={[styles.userRow, { backgroundColor: colors.surface }]}
        onPress={() => router.push(`/chat/${item._id}`)}
        onLongPress={() => openManageGroup(item)}
      >
        <Image
          source={{
            uri:
              item.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'Group')}&background=8B5CF6&color=fff&size=100&bold=true`,
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.name || 'Nhóm không tên'}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {memberCount} thành viên - {isOwner ? 'Trưởng nhóm' : isAdmin ? 'Phó nhóm' : 'Thành viên'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => openManageGroup(item)}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Quản lý</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{section.title}</Text>
    </View>
  );

  const showSearchResults = searchQuery.trim().length > 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBlue, { backgroundColor: headerBg }]}>
        <View style={[styles.searchBar, { backgroundColor: searchSurface }]}>
          <Ionicons name="search-outline" size={24} color="#E5E7EB" />
          <TextInput
            placeholder="Tìm kiếm"
            placeholderTextColor="#E5E7EB"
            style={[styles.searchInput, { color: '#fff' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setRequestModalVisible(true)}>
            <Ionicons name="person-add-outline" size={22} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.topTabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { key: 'friends', label: 'Bạn bè' },
          { key: 'groups', label: 'Nhóm' },
          { key: 'oa', label: 'OA' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.topTabBtn, activeTab === tab.key && { borderBottomColor: brand }]}
            onPress={() => setActiveTab(tab.key as ContactTab)}
          >
            <Text style={[styles.topTabText, activeTab === tab.key ? { color: colors.text } : { color: colors.muted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'groups' ? (
        <FlatList
          data={groups}
          keyExtractor={(item) => item._id}
          renderItem={renderGroupItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
          ListHeaderComponent={
            <View style={{ backgroundColor: colors.surface }}>
              <TouchableOpacity
                style={styles.featureRow}
                onPress={async () => {
                  setSelectedGroupMembers([]);
                  await loadContacts();
                  setCreateGroupVisible(true);
                }}
              >
                <View style={[styles.featureIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Tạo nhóm mới</Text>
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.muted }}>Bạn chưa có nhóm nào</Text>
            </View>
          }
        />
      ) : activeTab !== 'friends' ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.muted }}>Tab này đang được cập nhật</Text>
        </View>
      ) : showSearchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item, index) => getUserId(item) || `search-${index}`}
          renderItem={renderSearchUserItem}
          ListEmptyComponent={
            isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={brand} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.muted }}>Không tìm thấy kết quả</Text>
              </View>
            )
          }
        />
      ) : (
        <SectionList
          sections={friendSections}
          keyExtractor={(item, index) => getUserId(item) || `friend-${index}`}
          renderItem={renderFriendItem}
          renderSectionHeader={renderSectionHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
          ItemSeparatorComponent={() => <RNView style={{ height: 0 }} />}
          ListHeaderComponent={
            <View style={{ backgroundColor: colors.surface }}>
              <TouchableOpacity style={styles.featureRow} onPress={() => setRequestModalVisible(true)}>
                <View style={[styles.featureIcon, { backgroundColor: brand }]}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Lời mời kết bạn ({incomingRequests.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.featureRow} onPress={() => setPhoneModalVisible(true)}>
                <View style={[styles.featureIcon, { backgroundColor: '#2563EB' }]}>
                  <Ionicons name="call-outline" size={20} color="#fff" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Kết bạn bằng số điện thoại</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.featureRow} onPress={() => setSyncModalVisible(true)}>
                <View style={[styles.featureIcon, { backgroundColor: '#16A34A' }]}>
                  <Ionicons name="sync-outline" size={20} color="#fff" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Đồng bộ danh bạ</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.featureRow} onPress={() => setQrModalVisible(true)}>
                <View style={[styles.featureIcon, { backgroundColor: '#7C3AED' }]}>
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>Kết bạn bằng QR</Text>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.filterWrap}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    activeFilter === 'all' && { backgroundColor: colorScheme === 'dark' ? '#374151' : '#EEF2F7' },
                  ]}
                  onPress={() => setActiveFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.muted },
                      activeFilter === 'all' && { color: colors.text, fontWeight: '700' },
                    ]}
                  >
                    Tất cả {friends.length}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    activeFilter === 'recent' && { backgroundColor: colorScheme === 'dark' ? '#374151' : '#EEF2F7' },
                  ]}
                  onPress={() => setActiveFilter('recent')}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.muted },
                      activeFilter === 'recent' && { color: colors.text, fontWeight: '700' },
                    ]}
                  >
                    Mới truy cập
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.suggestionHead}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>Gợi ý cho bạn</Text>
                <TouchableOpacity onPress={handleSendBulkFromSuggestions}>
                  <Text style={{ color: brand, fontWeight: '700' }}>Mời nhanh top 5</Text>
                </TouchableOpacity>
              </View>
              {smartSuggestions.length > 0 ? (
                <FlatList
                  data={smartSuggestions.slice(0, 5)}
                  keyExtractor={(item, index) => getUserId(item) || `suggest-${index}`}
                  renderItem={({ item }) => (
                    <SuggestionUserRow
                      item={item}
                      brand={brand}
                      colors={colors}
                      sentFriendRequestIds={sentFriendRequestIds}
                      getUserId={getUserId}
                      onAddFriend={handleAddFriend}
                    />
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={[styles.suggestionEmpty, { color: colors.muted }]}>
                  Chưa có gợi ý mới. Hãy đồng bộ danh bạ để nhận đề xuất chính xác hơn.
                </Text>
              )}
            </View>
          }
        />
      )}

      <PhoneFriendModal
        visible={phoneModalVisible}
        onClose={() => setPhoneModalVisible(false)}
        brand={brand}
        colors={colors}
        phoneSearch={phoneSearch}
        setPhoneSearch={setPhoneSearch}
        findingPhone={findingPhone}
        onFindByPhone={handleFindByPhone}
        phoneResult={phoneResult}
        sentFriendRequestIds={sentFriendRequestIds}
        getUserId={getUserId}
        onAddFriend={handleAddFriend}
      />

      <ContactSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        brand={brand}
        colors={colors}
        syncingContacts={syncingContacts}
        onSyncContacts={handleSyncContacts}
        deviceContactsCount={deviceContactsCount}
        syncedContactMatches={syncedContactMatches}
        sentFriendRequestIds={sentFriendRequestIds}
        getUserId={getUserId}
        onAddFriend={handleAddFriend}
      />

      <QrFriendModal
        visible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        brand={brand}
        colors={colors}
        currentUserId={user?.id || ''}
        qrInput={qrInput}
        setQrInput={setQrInput}
        onResolveQr={handleResolveQr}
        qrPreviewUser={qrPreviewUser}
        sentFriendRequestIds={sentFriendRequestIds}
        getUserId={getUserId}
        onAddFriend={handleAddFriend}
      />

      <FriendRequestsModal
        visible={requestModalVisible}
        onClose={() => setRequestModalVisible(false)}
        brand={brand}
        colors={colors}
        incomingRequests={incomingRequests}
        processingRequestId={processingRequestId}
        handleRespondRequest={handleRespondRequest}
        getRequestSender={getRequestSender}
      />

      <CreateGroupModal
        visible={createGroupVisible}
        onClose={() => setCreateGroupVisible(false)}
        brand={brand}
        colors={colors}
        groupActionLoading={groupActionLoading}
        handleCreateGroup={handleCreateGroup}
        groupNameInput={groupNameInput}
        setGroupNameInput={setGroupNameInput}
        friends={friends}
        selectedGroupMembers={selectedGroupMembers}
        toggleMemberSelection={toggleMemberSelection}
        getUserId={getUserId}
      />

      <GroupManageModal
        visible={groupManageVisible}
        onClose={() => setGroupManageVisible(false)}
        brand={brand}
        colors={colors}
        colorScheme={colorScheme as 'light' | 'dark'}
        selectedGroup={selectedGroup}
        groupActionLoading={groupActionLoading}
        currentUserId={currentUserId}
        getUserId={getUserId}
        getConversationUserId={getConversationUserId}
        openTextEditor={openTextEditor}
        handleGroupAction={handleGroupAction}
        updateGroupName={updateGroupName}
        updateGroupAvatar={updateGroupAvatar}
        setAddMembersVisible={setAddMembersVisible}
        setSelectedMembersToAdd={setSelectedMembersToAdd}
        promoteGroupAdmin={promoteGroupAdmin}
        demoteGroupAdmin={demoteGroupAdmin}
        removeGroupMember={removeGroupMember}
        leaveGroup={leaveGroup}
      />

      <Modal visible={addMembersVisible} animationType="slide" onRequestClose={() => setAddMembersVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setAddMembersVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm thành viên</Text>
            <TouchableOpacity
              disabled={!selectedGroup || groupActionLoading || selectedMembersToAdd.length === 0}
              onPress={() => {
                if (!selectedGroup) return;
                void handleGroupAction(
                  () => addGroupMembers(selectedGroup._id, selectedMembersToAdd),
                  'Đã thêm thành viên mới',
                );
                setAddMembersVisible(false);
                setSelectedMembersToAdd([]);
              }}
            >
              <Text style={{ color: selectedMembersToAdd.length > 0 ? brand : colors.muted, fontWeight: '700' }}>Thêm</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={friends.filter((friend) => {
              const friendId = getUserId(friend);
              const memberIds = new Set((selectedGroup?.participants || []).map((member) => getUserId(member)));
              return friendId && !memberIds.has(friendId);
            })}
            keyExtractor={(item, index) => getUserId(item) || `add-member-${index}`}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.muted }}>Không còn bạn bè để thêm</Text>
              </View>
            }
            renderItem={({ item }) => {
              const uid = getUserId(item);
              const checked = selectedMembersToAdd.includes(uid);
              return (
                <TouchableOpacity style={[styles.userRow, { backgroundColor: colors.surface }]} onPress={() => toggleAddMemberSelection(uid)}>
                  <Image
                    source={{
                      uri:
                        item.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=2563EB&color=fff&size=100&bold=true`,
                    }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <Text style={[styles.userName, { color: colors.text }]}>{item.username}</Text>
                  </View>
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? brand : colors.muted} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.editorOverlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 12 }]}>{editorTitle}</Text>
            <TextInput
              value={editorValue}
              onChangeText={setEditorValue}
              placeholder={editorPlaceholder}
              placeholderTextColor={colors.muted}
              style={[styles.groupInput, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.editorActions}>
              <TouchableOpacity onPress={() => setEditorVisible(false)} style={[styles.editorBtn, { backgroundColor: '#E5E7EB' }]}>
                <Text style={{ color: '#374151', fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const value = editorValue.trim();
                  if (!value || !editorSubmit) return;
                  setEditorVisible(false);
                  editorSubmit(value);
                }}
                style={[styles.editorBtn, { backgroundColor: brand }]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBlue: {
    paddingTop: 8,
    paddingBottom: 10,
    paddingHorizontal: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
  },

  topTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  topTabText: {
    fontSize: 16,
    fontWeight: '600',
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 8,
  },

  filterWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterText: {
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionHead: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  suggestionEmpty: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 13,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },

  modalContainer: { flex: 1 },
  modalHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  groupInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  groupActionBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  myQrCard: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    padding: 12,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  smallBtn: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  editorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editorCard: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editorBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
