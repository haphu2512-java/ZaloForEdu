import React from 'react';
import { Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ChatMediaMenuModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  isGroup: boolean;
  onTakeImage: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onCreatePoll?: () => void;
};

export default function ChatMediaMenuModal({
  visible,
  onClose,
  colors,
  isGroup,
  onTakeImage,
  onPickImage,
  onPickDocument,
  onCreatePoll,
}: ChatMediaMenuModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { backgroundColor: colors.surface }]}>
          <TouchableOpacity style={styles.item} onPress={onTakeImage}>
            <View style={[styles.iconWrap, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="camera" size={26} color="#DB2777" />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>Máy ảnh</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={onPickImage}>
            <View style={[styles.iconWrap, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="image" size={26} color="#4F46E5" />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>Thư viện</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={onPickDocument}>
            <View style={[styles.iconWrap, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="document-attach" size={26} color="#10B981" />
            </View>
            <Text style={[styles.label, { color: colors.text }]}>Tệp tài liệu</Text>
          </TouchableOpacity>

          {isGroup && onCreatePoll ? (
            <TouchableOpacity style={styles.item} onPress={onCreatePoll}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="stats-chart" size={26} color="#D97706" />
              </View>
              <Text style={[styles.label, { color: colors.text }]}>Bình chọn</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  menu: { flexDirection: 'row', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 20 },
  item: { alignItems: 'center', flex: 1 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', marginTop: 4 },
});

