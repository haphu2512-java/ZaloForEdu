import { useState, useEffect, useCallback, useMemo } from 'react';
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
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '@/utils/friendService';
import { searchUsers } from '@/utils/searchService';
import { blockOrUnblockUser } from '@/utils/userService';
import type { UserInfo, FriendRequest, Conversation } from '@/types/chat';

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
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
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
    try {
      const [friendsRes, incomingRes, conversationsRes] = await Promise.all([
        getFriendList(null, 100),
        getIncomingFriendRequests(null, 100),
        getConversations(null, 100),
      ]);
      setFriends(friendsRes?.items || []);
      setIncomingRequests(incomingRes?.items || []);
      const myGroups = (conversationsRes?.items || []).filter((conv) => conv.type === 'group');
      setGroups(myGroups);
    } catch (error: any) {
      console.log('Failed to fetch contacts:', error.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadContacts();
      setLoading(false);
    };
    init();
  }, [loadContacts]);

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

  const filteredFriends = useMemo(() => {
    if (activeFilter === 'all') return friends;
    return friends.filter((f) => !!f.isOnline);
  }, [friends, activeFilter]);

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
    setSelectedGroup(group);
    setGroupManageVisible(true);
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
      await action();
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
        </View>
        {!isFriend(uid) ? (
          <View style={{ gap: 8, backgroundColor: 'transparent' }}>
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
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
            <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Bạn bè</Text>
          </View>
        )}
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
            </View>
          }
        />
      )}

      <Modal visible={requestModalVisible} animationType="slide" onRequestClose={() => setRequestModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Lời mời kết bạn</Text>
            <View style={{ width: 40 }} />
          </View>

          <FlatList
            data={incomingRequests}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.muted }}>Không có lời mời nào</Text>
              </View>
            }
            renderItem={({ item }) => {
              const sender = getRequestSender(item);
              return (
                <View style={[styles.requestRow, { borderBottomColor: colors.border }]}>
                  <Image
                    source={{
                      uri:
                        sender?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.username || 'User')}&background=2563EB&color=fff&size=100&bold=true`,
                    }}
                    style={styles.avatar}
                  />
                  <View style={{ flex: 1, backgroundColor: 'transparent' }}>
                    <Text style={[styles.userName, { color: colors.text }]}>{sender?.username || 'Người dùng'}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {sender?.email || sender?.phone || 'Đã gửi lời mời kết bạn'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#DCFCE7' }]}
                    disabled={processingRequestId === item._id}
                    onPress={() => handleRespondRequest(item._id, 'accept')}
                  >
                    <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Đồng ý</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: '#F3F4F6' }]}
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

      <Modal visible={createGroupVisible} animationType="slide" onRequestClose={() => setCreateGroupVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setCreateGroupVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo nhóm</Text>
            <TouchableOpacity disabled={groupActionLoading} onPress={handleCreateGroup}>
              <Text style={{ color: groupActionLoading ? colors.muted : brand, fontWeight: '700' }}>Tạo</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 16, gap: 12, backgroundColor: 'transparent' }}>
            <TextInput
              value={groupNameInput}
              onChangeText={setGroupNameInput}
              placeholder="Nhập tên nhóm"
              placeholderTextColor={colors.muted}
              style={[styles.groupInput, { borderColor: colors.border, color: colors.text }]}
            />
            <Text style={{ color: colors.muted, fontSize: 13 }}>Chọn tối thiểu 2 bạn bè để tạo nhóm</Text>
          </View>
          {friends.length <= 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.muted }}>Bạn chưa có bạn bè để tạo nhóm</Text>
            </View>
          ) : null}

          <FlatList
            data={friends}
            keyExtractor={(item, index) => getUserId(item) || `member-${index}`}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.muted }}>Bạn chưa có bạn bè để tạo nhóm</Text>
              </View>
            }
            renderItem={({ item }) => {
              const fid = getUserId(item);
              const checked = selectedGroupMembers.includes(fid);
              return (
                <TouchableOpacity
                  style={[styles.userRow, { backgroundColor: colors.surface }]}
                  onPress={() => toggleMemberSelection(fid)}
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
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? brand : colors.muted} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>

      <Modal visible={groupManageVisible} animationType="slide" onRequestClose={() => setGroupManageVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setGroupManageVisible(false)}>
              <Text style={{ color: brand, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Quản lý nhóm</Text>
            <View style={{ width: 40 }} />
          </View>
          {selectedGroup ? (
            <FlatList
              data={selectedGroup.participants || []}
              keyExtractor={(item, index) => getUserId(item) || `participant-${index}`}
              ListHeaderComponent={
                <View style={{ padding: 16, gap: 10, backgroundColor: 'transparent' }}>
                  <Text style={[styles.userName, { color: colors.text }]}>{selectedGroup.name || 'Nhóm không tên'}</Text>
                  <TouchableOpacity
                    style={[styles.groupActionBtn, { backgroundColor: colorScheme === 'dark' ? '#312E81' : '#EEF2FF', borderColor: colors.border }]}
                    disabled={groupActionLoading}
                    onPress={() =>
                      openTextEditor(
                        'Đổi tên nhóm',
                        'Nhập tên mới',
                        (value) =>
                          void handleGroupAction(
                            () => updateGroupName(selectedGroup._id, value),
                            'Đã cập nhật tên nhóm',
                          ),
                        selectedGroup.name || '',
                      )
                    }
                  >
                    <Text style={{ color: colorScheme === 'dark' ? '#A5B4FC' : '#3730A3', fontWeight: '700' }}>Đổi tên nhóm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.groupActionBtn, { backgroundColor: colorScheme === 'dark' ? '#4C1D95' : '#F3E8FF', borderColor: colors.border }]}
                    disabled={groupActionLoading}
                    onPress={() =>
                      openTextEditor(
                        'Đổi ảnh nhóm',
                        'Nhập URL ảnh nhóm',
                        (value) =>
                          void handleGroupAction(
                            () => updateGroupAvatar(selectedGroup._id, value),
                            'Đã cập nhật ảnh nhóm',
                          ),
                        selectedGroup.avatarUrl || '',
                      )
                    }
                  >
                    <Text style={{ color: colorScheme === 'dark' ? '#DDD6FE' : '#7E22CE', fontWeight: '700' }}>Đổi ảnh nhóm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.groupActionBtn, { backgroundColor: colorScheme === 'dark' ? '#064E3B' : '#ECFDF5', borderColor: colors.border }]}
                    disabled={groupActionLoading}
                    onPress={() => {
                      setSelectedMembersToAdd([]);
                      setAddMembersVisible(true);
                    }}
                  >
                    <Text style={{ color: colorScheme === 'dark' ? '#6EE7B7' : '#065F46', fontWeight: '700' }}>Thêm thành viên</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.groupActionBtn, { backgroundColor: colorScheme === 'dark' ? '#7F1D1D' : '#FEE2E2', borderColor: colors.border }]}
                    disabled={groupActionLoading}
                    onPress={() =>
                      handleGroupAction(() => leaveGroup(selectedGroup._id), 'Bạn đã rời nhóm')
                    }
                  >
                    <Text style={{ color: '#991B1B', fontWeight: '700' }}>Rời nhóm</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => {
                const uid = getUserId(item);
                const ownerId = getConversationUserId(selectedGroup.ownerId) || selectedGroup.createdBy;
                const adminIds = (selectedGroup.adminIds || []).map((admin) => getConversationUserId(admin));
                const isOwner = ownerId === uid;
                const isAdmin = adminIds.includes(uid);
                const iAmOwner = ownerId === currentUserId;
                const iAmAdmin = iAmOwner || adminIds.includes(currentUserId);

                return (
                  <View style={[styles.requestRow, { borderBottomColor: colors.border }]}>
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
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        {isOwner ? 'Trưởng nhóm' : isAdmin ? 'Phó nhóm' : 'Thành viên'}
                      </Text>
                    </View>
                    {iAmOwner && !isOwner && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#E0E7FF' }]}
                        onPress={() =>
                          handleGroupAction(
                            () =>
                              isAdmin
                                ? demoteGroupAdmin(selectedGroup._id, uid)
                                : promoteGroupAdmin(selectedGroup._id, uid),
                            isAdmin ? 'Đã hạ quyền admin' : 'Đã nâng quyền admin',
                          )
                        }
                      >
                        <Text style={{ color: '#3730A3', fontWeight: '700', fontSize: 12 }}>{isAdmin ? 'Hạ quyền' : 'Nâng quyền'}</Text>
                      </TouchableOpacity>
                    )}
                    {iAmAdmin && !isOwner && uid !== currentUserId && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                        onPress={() =>
                          handleGroupAction(
                            () => removeGroupMember(selectedGroup._id, uid),
                            'Đã xóa thành viên',
                          )
                        }
                      >
                        <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>Xóa</Text>
                      </TouchableOpacity>
                    )}
                    {iAmOwner && !isOwner && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#DCFCE7' }]}
                        onPress={() =>
                          handleGroupAction(
                            () => transferGroupOwner(selectedGroup._id, { newOwnerId: uid }),
                            'Đã chuyển quyền trưởng nhóm',
                          )
                        }
                      >
                        <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Chuyển quyền</Text>
                      </TouchableOpacity>
                    )}
                    {iAmAdmin && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: '#FEF3C7' }]}
                        onPress={() =>
                          openTextEditor(
                            'Đặt biệt danh',
                            `Biệt danh cho ${item.username}`,
                            (value) =>
                              void handleGroupAction(
                                () => updateGroupNickname(selectedGroup._id, uid, value),
                                'Đã cập nhật biệt danh',
                              ),
                          )
                        }
                      >
                        <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>Biệt danh</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.muted }}>Không có dữ liệu nhóm</Text>
            </View>
          )}
        </View>
      </Modal>

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
