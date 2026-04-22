import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet, Platform } from 'react-native';

export type ChatActionMenuOption = {
  text: string;
  onPress: () => void;
  isDestructive?: boolean;
  style?: 'default' | 'cancel' | 'destructive';
};

type ChatActionMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  options: ChatActionMenuOption[];
  colors: any;
};

export default function ChatActionMenuModal({
  visible,
  onClose,
  options,
  colors,
}: ChatActionMenuModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {options.map((opt, index) => (
            <TouchableOpacity
              key={`${opt.text}-${index}`}
              style={[styles.button, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              onPress={() => {
                onClose();
                opt.onPress?.();
              }}
            >
              <Text style={{ fontSize: 16, color: opt.isDestructive ? '#EF4444' : colors.text, fontWeight: opt.style === 'cancel' ? '700' : '400' }}>
                {opt.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 16 },
  container: { borderRadius: 14, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  button: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});

