/**
 * app/create-poll.tsx
 * Màn hình tạo bình chọn
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StyleSheet, Switch
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { createPoll } from '@/utils/pollService';

export default function CreatePollScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowAddOptions, setAllowAddOptions] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const validOptions = options.map(o => o.trim()).filter(o => o.length > 0);
    if (!question.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập câu hỏi bình chọn');
      return;
    }
    if (validOptions.length < 2) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất 2 lựa chọn');
      return;
    }

    try {
      setCreating(true);
      await createPoll({
        conversationId,
        question: question.trim(),
        options: validOptions,
        isMultipleChoice,
        isAnonymous,
        allowAddOptions,
      });
      Alert.alert('Thành công', 'Đã tạo bình chọn', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo bình chọn');
    } finally {
      setCreating(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const removeOption = (index: number) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
      <Stack.Screen 
        options={{ 
          headerTitle: 'Tạo bình chọn',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={handleCreate} disabled={creating} style={{ marginRight: 8, padding: 8 }}>
              {creating ? <ActivityIndicator size="small" color={colors.tint} /> : <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 16 }}>Tạo</Text>}
            </TouchableOpacity>
          )
        }} 
      />

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TextInput
          style={[styles.questionInput, { color: colors.text }]}
          placeholder="Đặt câu hỏi bình chọn..."
          placeholderTextColor={colors.muted}
          value={question}
          onChangeText={setQuestion}
          multiline
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>CÁC LỰA CHỌN</Text>
        
        {options.map((opt, index) => (
          <View key={index.toString()} style={styles.optionRow}>
            <TextInput
              style={[styles.optionInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder={`Lựa chọn ${index + 1}`}
              placeholderTextColor={colors.muted}
              value={opt}
              onChangeText={(val) => updateOption(index, val)}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => removeOption(index)} style={styles.removeBtn}>
                <Ionicons name="close-circle" size={24} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {options.length < 10 && (
          <TouchableOpacity 
            style={[styles.addOptionBtn, { backgroundColor: colors.background }]}
            onPress={() => setOptions([...options, ''])}
          >
            <Ionicons name="add" size={20} color={colors.tint} />
            <Text style={{ color: colors.tint, fontWeight: '600' }}>Thêm lựa chọn</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderBottomColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 16 }]}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Chọn nhiều phương án</Text>
          <Switch value={isMultipleChoice} onValueChange={setIsMultipleChoice} trackColor={{ true: colors.tint }} />
        </View>
        <View style={styles.settingRow}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Người bình chọn có thể thêm lựa chọn</Text>
          <Switch value={allowAddOptions} onValueChange={setAllowAddOptions} trackColor={{ true: colors.tint }} />
        </View>
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>Bình chọn ẩn danh</Text>
          <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ true: colors.tint }} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  questionInput: { fontSize: 20, fontWeight: '600', minHeight: 60 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  optionInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
  removeBtn: { padding: 8, marginLeft: 4 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  settingLabel: { fontSize: 16 },
});
