import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommentInputProps {
  colors: any;
  placeholder?: string;
  onSubmit: (text: string) => Promise<void>;
}

export default function CommentInput({ colors, placeholder = 'Viết bình luận...', onSubmit }: CommentInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      <TextInput
        style={[s.input, { backgroundColor: colors.secondaryBackground || '#F3F4F6', color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
      />
      <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={!text.trim() || sending}>
        {sending ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <Ionicons name="send" size={22} color={text.trim() ? colors.tint : colors.muted} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: { padding: 8 },
});
