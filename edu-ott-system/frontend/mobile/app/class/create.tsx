import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';

export default function CreateClassScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Only teacher/admin can access
  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="lock-closed" size={48} color="#EF4444" />
        <Text style={s.permissionText}>Bạn không có quyền tạo lớp học</Text>
        <Text style={s.permissionSubtext}>Chỉ giảng viên và quản trị viên mới có thể tạo lớp</Text>
        <TouchableOpacity style={s.backButton} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [maxStudents, setMaxStudents] = useState('');
  const [allowStudentPost, setAllowStudentPost] = useState(true);
  const [allowFileUpload, setAllowFileUpload] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name.trim() || !code.trim() || !subject.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền tên lớp, mã lớp và môn học');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: any = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        subject: subject.trim(),
        settings: { allowStudentPost, allowFileUpload, requireApproval },
      };
      if (description.trim()) body.description = description.trim();
      if (semester.trim()) body.semester = semester.trim();
      if (academicYear.trim()) body.academicYear = academicYear.trim();
      if (maxStudents.trim()) body.maxStudents = parseInt(maxStudents);

      const res = await fetchAPI('/classes', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      Alert.alert('Thành công ✅', `Lớp "${res.data?.class?.name}" đã được tạo!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo lớp học');
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
        <Text style={s.headerTitle}>Tạo lớp học mới</Text>
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
          {/* Required fields */}
          <Text style={s.sectionTitle}>Thông tin bắt buộc</Text>

          <FormInput label="Tên lớp *" placeholder="VD: Lập trình Web" value={name} onChangeText={setName} icon="school-outline" />
          <FormInput label="Mã lớp *" placeholder="VD: WEB101" value={code} onChangeText={(v) => setCode(v.toUpperCase())} icon="code-outline" autoCapitalize="characters" />
          <FormInput label="Môn học *" placeholder="VD: Công nghệ phần mềm" value={subject} onChangeText={setSubject} icon="book-outline" />

          {/* Optional fields */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Thông tin thêm</Text>

          <FormInput label="Mô tả" placeholder="Mô tả ngắn về lớp học..." value={description} onChangeText={setDescription} icon="document-text-outline" multiline />
          <FormInput label="Học kỳ" placeholder="VD: HK1" value={semester} onChangeText={setSemester} icon="calendar-outline" />
          <FormInput label="Năm học" placeholder="VD: 2025-2026" value={academicYear} onChangeText={setAcademicYear} icon="time-outline" />
          <FormInput label="Sĩ số tối đa" placeholder="VD: 50" value={maxStudents} onChangeText={setMaxStudents} icon="people-outline" keyboardType="number-pad" />

          {/* Settings */}
          <Text style={[s.sectionTitle, { marginTop: 24 }]}>Cài đặt lớp</Text>

          <View style={s.settingsCard}>
            <SettingToggle label="Cho phép sinh viên đăng bài" description="Sinh viên có thể gửi tin nhắn trong lớp" value={allowStudentPost} onChange={setAllowStudentPost} />
            <SettingToggle label="Cho phép tải tệp lên" description="Thành viên có thể gửi file đính kèm" value={allowFileUpload} onChange={setAllowFileUpload} />
            <SettingToggle label="Yêu cầu phê duyệt" description="Sinh viên cần được duyệt mới vào được lớp" value={requireApproval} onChange={setRequireApproval} />
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ===== Sub-components =====

function FormInput({
  label, placeholder, value, onChangeText, icon, multiline, keyboardType, autoCapitalize,
}: {
  label: string; placeholder: string; value: string; onChangeText: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap; multiline?: boolean; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <View style={s.inputGroup}>
      <Text style={s.inputLabel}>{label}</Text>
      <View style={[s.inputWrapper, multiline && { alignItems: 'flex-start' }]}>
        <Ionicons name={icon} size={18} color="#9CA3AF" style={{ marginTop: multiline ? 14 : 0 }} />
        <TextInput
          style={[s.textInput, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#C9CDD3"
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
}

function SettingToggle({
  label, description, value, onChange,
}: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.settingToggle}>
      <View style={{ flex: 1 }}>
        <Text style={s.settingLabel}>{label}</Text>
        <Text style={s.settingDesc}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: '#007AFF', false: '#E5E7EB' }} />
    </View>
  );
}

// ===== Styles =====
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA', paddingHorizontal: 40 },
  permissionText: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 16, textAlign: 'center' },
  permissionSubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  backButton: { backgroundColor: '#007AFF', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 20 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  submitBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  form: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
    borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12,
  },
  textInput: { flex: 1, fontSize: 15, color: '#111827' },

  settingsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 4 },
  settingToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6',
  },
  settingLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
