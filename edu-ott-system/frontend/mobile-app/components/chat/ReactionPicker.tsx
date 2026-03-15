import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable } from 'react-native';

// ============================================================
// ReactionPicker - Modal chọn emoji reaction
// ============================================================

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  currentUserReaction?: string;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const ReactionPicker: React.FC<ReactionPickerProps> = ({
  visible,
  onSelect,
  onClose,
  currentUserReaction,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 justify-center items-center bg-black/30" onPress={onClose}>
        <Pressable
          className="bg-white rounded-2xl px-4 py-3 shadow-lg flex-row items-center"
          onPress={(e) => e.stopPropagation()}
        >
          {REACTIONS.map((emoji) => {
            const isSelected = currentUserReaction === emoji;
            return (
              <TouchableOpacity
                key={emoji}
                onPress={() => onSelect(emoji)}
                className={`mx-1.5 p-2 rounded-full ${isSelected ? 'bg-blue-100' : ''}`}
                activeOpacity={0.6}
              >
                <Text className="text-[28px]">{emoji}</Text>
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
