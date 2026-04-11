import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';

interface ClassOption {
  _id: string;
  name: string;
  code: string;
}

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load available classes for selection
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAPI('/classes?limit=100&status=active');
        setClasses(res.data?.classes || []);
      } catch {
        console.log('Failed to load classes for group creation');
      } finally {
        setLoadingClasses(false);
      }
    })();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (!selectedClassId) {
      Alert.alert('Lỗi', 'Vui lòng chọn lớp học cho nhóm');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: any = {
        name: name.trim(),
        classId: selectedClassId,
      };
      if (description.trim()) body.description = description.trim();
      if (maxMembers.trim()) body.maxMembers = parseInt(maxMembers);

      const res = await fetchAPI('/groups', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      Alert.alert('Thành công ✅', `Nhóm "${res.data?.group?.name}" đã được tạo!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo nhóm');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="close" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Tạo nhóm mới</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={isSubmitting}
          style={[s.submitBtn, isSubmitting && { opacity: 0.5 }]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.submitBtnText}>Tạo</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={s.form} showsVerticalScrollIndicator={false}>
          {/* Group info */}
          <View style={s.iconCenter}>
            <View style={s.groupIconLarge}>
              <Ionicons name="people" size={36} color="#8B5CF6" />
            </View>
          </View>

          <Text style={s.sectionTitle}>Thông tin nhóm</Text>

          {/* Name */}
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Tên nhóm *</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="people-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={s.textInput}
                placeholder="VD: Nhóm 1"
                placeholderTextColor="#C9CDD3"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          {/* Description */}
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Mô tả</Text>
            <View style={[s.inputWrapper, { alignItems: 'flex-start' }]}>
              <Ionicons name="document-text-outline" size={18} color="#9CA3AF" style={{ marginTop: 14 }} />
              <TextInput
                style={[s.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Mô tả ngắn về nhóm..."
                placeholderTextColor="#C9CDD3"
                value={description}
                onChangeText={setDescription}
                multiline
              />
            </View>
          </View>

          {/* Max members */}
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Số thành viên tối đa</Text>
            <View style={s.inputWrapper}>
              <Ionicons name="person-add-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={s.textInput}
                placeholder="VD: 10 (để trống = không giới hạn)"
                placeholderTextColor="#C9CDD3"
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Class selection */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Chọn lớp học *</Text>

          {loadingClasses ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Đang tải danh sách lớp...</Text>
            </View>
          ) : classes.length === 0 ? (
            <View style={s.emptyClasses}>
              <Ionicons name="school-outline" size={32} color="#D1D5DB" />
              <Text style={s.emptyClassesText}>Bạn chưa tham gia lớp học nào</Text>
            </View>
          ) : (
            <View style={s.classList}>
              {classes.map((cls) => (
                <TouchableOpacity
                  key={cls._id}
                  style={[
                    s.classItem,
                    selectedClassId === cls._id && s.classItemSelected,
                  ]}
                  onPress={() => setSelectedClassId(cls._id)}
                  activeOpacity={0.7}
                >
                  <View style={[s.classItemIcon, selectedClassId === cls._id && { backgroundColor: '#8B5CF615' }]}>
                    <Ionicons
                      name="school"
                      size={18}
                      color={selectedClassId === cls._id ? '#8B5CF6' : '#9CA3AF'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.classItemCode, selectedClassId === cls._id && { color: '#8B5CF6' }]}>{cls.code}</Text>
                    <Text style={s.classItemName} numberOfLines={1}>{cls.name}</Text>
                  </View>
                  {selectedClassId === cls._id && (
                    <Ionicons name="checkmark-circle" size={22} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ===== Styles =====
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  submitBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  form: { flex: 1, padding: 16 },

  iconCenter: { alignItems: 'center', marginBottom: 20 },
  groupIconLarge: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#8B5CF612', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12,
  },
  textInput: { flex: 1, fontSize: 15, color: '#111827' },

  classList: { gap: 8 },
  classItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  classItemSelected: { borderColor: '#8B5CF6', backgroundColor: '#FAF5FF' },
  classItemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  classItemCode: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  classItemName: { fontSize: 15, fontWeight: '600', color: '#111827', marginTop: 1 },

  emptyClasses: { padding: 32, alignItems: 'center', backgroundColor: '#fff', borderRadius: 14 },
  emptyClassesText: { color: '#9CA3AF', marginTop: 8, fontSize: 14 },
});
