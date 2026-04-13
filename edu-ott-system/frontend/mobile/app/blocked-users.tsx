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
import { getBlockedUsers, blockOrUnblockUser } from '@/utils/userService';
import type { User } from '@/types/auth';

export default function BlockedUsersScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [blockedUsers, setBlockedUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    const loadBlockedUsers = useCallback(async () => {
        try {
            const users = await getBlockedUsers();
            setBlockedUsers(users as any[]);
        } catch (error: any) {
            console.log('Failed to fetch blocked users:', error.message);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            await loadBlockedUsers();
            setLoading(false);
        };
        init();
    }, [loadBlockedUsers]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadBlockedUsers();
        setRefreshing(false);
    }, [loadBlockedUsers]);

    const handleUnblock = (user: any) => {
        Alert.alert(
            'Bỏ chặn người dùng',
            `Bạn có chắc muốn bỏ chặn ${user.username}?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Bỏ chặn',
                    onPress: async () => {
                        const uid = user._id || user.id;
                        setUnblockingId(uid);
                        try {
                            await blockOrUnblockUser(uid, 'unblock');
                            setBlockedUsers((prev) => prev.filter((u: any) => (u._id || u.id) !== uid));
                            Alert.alert('Thành công', `Đã bỏ chặn ${user.username}`);
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.message || 'Không thể bỏ chặn người dùng');
                        } finally {
                            setUnblockingId(null);
                        }
                    },
                },
            ],
        );
    };

    const renderItem = ({ item }: { item: any }) => {
        const uid = item._id || item.id;
        const isUnblocking = unblockingId === uid;
        const avatarUri =
            item.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username || 'U')}&background=EF4444&color=fff&size=100&bold=true`;

        return (
            <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.userCardLeft}>
                    <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    <View style={styles.userInfo}>
                        <Text style={[styles.username, { color: colors.text }]}>{item.username || 'Unknown'}</Text>
                        {item.email ? (
                            <Text style={[styles.userEmail, { color: colors.muted }]}>{item.email}</Text>
                        ) : null}
                    </View>
                </View>
                <TouchableOpacity
                    style={[styles.unblockBtn, { borderColor: colors.error }]}
                    onPress={() => handleUnblock(item)}
                    disabled={isUnblocking}
                >
                    {isUnblocking ? (
                        <ActivityIndicator size="small" color={colors.error} />
                    ) : (
                        <>
                            <Ionicons name="ban" size={14} color={colors.error} />
                            <Text style={[styles.unblockText, { color: colors.error }]}>Bỏ chặn</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
                <Ionicons name="shield-checkmark-outline" size={48} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Không có người bị chặn</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Danh sách người dùng bạn đã chặn sẽ hiển thị ở đây.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: colorScheme === 'dark' ? colors.surface : colors.tint,
                        paddingTop: insets.top + 8,
                    },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? colors.text : "#fff"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colorScheme === 'dark' ? colors.text : "#fff" }]}>Danh sách chặn</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Count badge */}
            {!loading && blockedUsers.length > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="ban" size={16} color={colors.error} />
                    <Text style={[styles.countText, { color: colors.muted }]}>
                        {blockedUsers.length} người dùng đang bị chặn
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
                    data={blockedUsers}
                    keyExtractor={(item: any) => item._id || item.id || String(Math.random())}
                    renderItem={renderItem}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                    }
                    contentContainerStyle={[
                        styles.listContent,
                        blockedUsers.length === 0 ? { flex: 1 } : undefined,
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },

    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
    },
    countText: { fontSize: 13, fontWeight: '500' },

    listContent: { padding: 16, paddingTop: 8 },

    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 14,
        borderWidth: StyleSheet.hairlineWidth,
    },
    userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
    userInfo: { flex: 1 },
    username: { fontSize: 15, fontWeight: '600' },
    userEmail: { fontSize: 12, marginTop: 2 },

    unblockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 80,
        justifyContent: 'center',
    },
    unblockText: { fontSize: 13, fontWeight: '600' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyIcon: {
        width: 96, height: 96, borderRadius: 48,
        alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    },
    emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
