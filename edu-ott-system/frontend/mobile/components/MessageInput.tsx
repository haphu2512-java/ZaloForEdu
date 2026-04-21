import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  disabled?: boolean;
  canPostAnnouncement?: boolean;
  onSend: (payload: { content: string; type: 'text' | 'announcement' }) => void;
  onAttachImage?: () => void;
  onAttachFile?: () => void;
};

export default function MessageInput({
  disabled,
  canPostAnnouncement,
  onSend,
  onAttachImage,
  onAttachFile,
}: Props) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'text' | 'announcement'>('text');

  const submit = () => {
    const content = text.trim();
    if (!content || disabled) return;
    onSend({ content, type: mode });
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.iconBtn} onPress={onAttachImage} disabled={disabled}>
          <Ionicons name="image-outline" size={20} color={disabled ? '#9CA3AF' : '#1D67FF'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onAttachFile} disabled={disabled}>
          <Ionicons name="attach-outline" size={20} color={disabled ? '#9CA3AF' : '#1D67FF'} />
        </TouchableOpacity>

        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          value={text}
          onChangeText={setText}
          editable={!disabled}
          placeholder={disabled ? 'Bạn không có quyền nhắn ở kênh này' : 'Nhắn tin...'}
        />

        <TouchableOpacity style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : null]} onPress={submit} disabled={!text.trim() || !!disabled}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {canPostAnnouncement ? (
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeChip, mode === 'text' && styles.modeChipActive]} onPress={() => setMode('text')}>
            <Text style={[styles.modeText, mode === 'text' && styles.modeTextActive]}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeChip, mode === 'announcement' && styles.modeChipActive]} onPress={() => setMode('announcement')}>
            <Text style={[styles.modeText, mode === 'announcement' && styles.modeTextActive]}>📢 Announcement</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', padding: 10, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#F3F4F6', color: '#9CA3AF' },
  sendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#9CA3AF', alignItems: 'center', justifyContent: 'center' },
  sendBtnActive: { backgroundColor: '#1D67FF' },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modeChip: { backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  modeChipActive: { backgroundColor: '#DBEAFE' },
  modeText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  modeTextActive: { color: '#1D4ED8' },
});
