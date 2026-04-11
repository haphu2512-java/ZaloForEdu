import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';

interface User {
  _id: string;
  fullName: string;
  email?: string;
  avatar?: string;
  role: string;
}

interface AddMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (userId: string) => Promise<void>;
  title?: string;
}

export function AddMemberModal({ visible, onClose, onAdd, title = 'Thêm thành viên' }: AddMemberModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<User[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchAPI(`/users/search?q=${encodeURIComponent(query)}`);
        setResults(res.data?.users || []);
      } catch (err: any) {
        console.error('Search error:', err.message);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = async (userId: string) => {
    setAddingId(userId);
    try {
      await onAdd(userId);
      Alert.alert('Thành công', 'Đã thêm thành viên');
      setQuery('');
      setResults([]);
      onClose();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể thêm thành viên');
    } finally {
      setAddingId(null);
    }
  };

  const renderItem = ({ item }: { item: User }) => (
    <View style={s.userRow}>
      <Image
        source={{
          uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=8B5CF6&color=fff`,
        }}
        style={s.avatar}
      />
      <View style={s.userInfo}>
        <Text style={s.userName}>{item.fullName}</Text>
        {item.email && <Text style={s.userEmail}>{item.email}</Text>}
      </View>
      <TouchableOpacity
        style={s.addButton}
        onPress={() => handleAdd(item._id)}
        disabled={addingId === item._id}
      >
        {addingId === item._id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={s.addText}>Thêm</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.container}>
          <View style={s.header}>
            <Text style={s.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={s.searchContainer}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={s.searchInput}
              placeholder="Tìm theo tên hoặc email..."
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                query.length >= 2 ? (
                  <Text style={s.emptyText}>Không tìm thấy kết quả nào</Text>
                ) : (
                  <Text style={s.emptyText}>Nhập ít nhất 2 ký tự để tìm kiếm</Text>
                )
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#111827',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 32,
    fontStyle: 'italic',
  },
});
