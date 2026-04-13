import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    StyleSheet,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getArchivedConversations, updateConversationPreference } from '@/utils/messageService';
import { useAuth } from '@/context/auth';
import type { Conversation } from '@/types/chat';

function formatTime(dateStr?: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    }
    return `${date.getDate()}/${date.getMonth() + 1}`;
}

export default function ArchivedConversationsScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

    const loadArchived = useCallback(async () => {
        try {
            const res = await getArchivedConversations();
            setConversations(res.items || []);
        } catch (error: any) {
            console.log('Failed to load archived conversations:', error.message);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadArchived();
            setLoading(false);
        };
        init();
    }, [loadArchived]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadArchived();
        setRefreshing(false);
    }, [loadArchived]);

    const handleUnarchive = (conv: Conversation) => {
        Alert.alert(
            'Bỏ lưu trữ',
            `Cuộc trò chuyện sẽ được hiện trở lại trong danh sách chính.`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Bỏ lưu trữ',
                    onPress: async () => {
                        const cid = conv._id;
                        setUnarchivingId(cid);
                        try {
                            await updateConversationPreference(cid, { isHidden: false });
                            setConversations((prev) => prev.filter((c) => c._id !== cid));
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.message || 'Không thể bỏ lưu trữ');
                        } finally {
                            setUnarchivingId(null);
                        }
                    },
                },
            ],
        );
    };

    const getDisplayName = (conv: Conversation): string => {
        if (conv.type === 'group' && conv.name) return conv.name;
        const currentUserId = user?.id || '';
        const other = conv.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
        return other?.username || 'Cuộc trò chuyện';
    };

    const getDisplayAvatar = (conv: Conversation): string => {
        if (conv.type === 'group') {
            if (conv.avatarUrl) return conv.avatarUrl;
            const name = conv.name || 'G';
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&size=100&bold=true`;
        }
        const currentUserId = user?.id || '';
        const other = conv.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
        return (
            other?.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(other?.username || 'U')}&background=6366F1&color=fff&size=100&bold=true`
        );
    };

    const renderItem = ({ item }: { item: Conversation }) => {
        const cid = item._id;
        const isUnarchiving = unarchivingId === cid;
        const latestMsg = (item as any).latestMessage;
        const lastText = latestMsg?.content || 'Không có tin nhắn';
        const lastTime = latestMsg?.createdAt || (item as any).lastMessageAt;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/chat/${cid}` as any)}
                activeOpacity={0.75}
            >
                <Image source={{ uri: getDisplayAvatar(item) }} style={styles.avatar} />

                <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                        <Text style={[styles.convName, { color: colors.text }]} numberOfLines={1}>
                            {getDisplayName(item)}
                        </Text>
                        <Text style={[styles.timeText, { color: colors.muted }]}>{formatTime(lastTime)}</Text>
                    </View>
                    <Text style={[styles.lastMsg, { color: colors.muted }]} numberOfLines={1}>
                        {lastText}
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.unarchiveBtn, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}
                    onPress={() => handleUnarchive(item)}
                    disabled={isUnarchiving}
                >
                    {isUnarchiving ? (
                        <ActivityIndicator size="small" color={colors.tint} />
                    ) : (
                        <Ionicons name="archive" size={16} color={colors.tint} />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name="archive-outline" size={48} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có tin nhắn lưu trữ</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Giữ lâu vào cuộc trò chuyện và chọn "Lưu trữ tin nhắn" để ẩn.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? colors.surface : colors.tint, paddingTop: insets.top + 8 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? colors.text : "#fff"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colorScheme === 'dark' ? colors.text : "#fff" }]}>Tin nhắn lưu trữ</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Info banner */}
            {!loading && conversations.length > 0 && (
                <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.tint} />
                    <Text style={[styles.infoText, { color: colors.muted }]}>
                        {conversations.length} cuộc trò chuyện đang được lưu trữ. Bấm{' '}
                        <Ionicons name="archive" size={12} color={colors.tint} /> để khôi phục.
                    </Text>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                    <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
                </View>
            ) : (
                <FlatList
                    data={conversations}
                    keyExtractor={(item) => item._id}
                    renderItem={renderItem}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                    }
                    contentContainerStyle={[
                        styles.listContent,
                        conversations.length === 0 ? { flex: 1 } : undefined,
                    ]}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 14,
    },
    backBtn: { width: 40 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        margin: 16,
        marginBottom: 4,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

    listContent: { padding: 16, paddingTop: 8 },

    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
        gap: 12,
    },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    cardBody: { flex: 1, minWidth: 0 },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    convName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
    timeText: { fontSize: 12 },
    lastMsg: { fontSize: 13 },

    unarchiveBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 96, height: 96, borderRadius: 48,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
