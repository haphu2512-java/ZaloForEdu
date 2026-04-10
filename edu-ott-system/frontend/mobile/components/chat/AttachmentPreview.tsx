import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Attachment } from '../../types/chat';

// ============================================================
// AttachmentPreview - Hiển thị danh sách file đính kèm
// Dùng trong MessageInput khi user chọn file trước khi gửi
// ============================================================

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  readonly?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('audio/')) return 'musical-notes';
  if (mimeType.startsWith('video/')) return 'videocam';
  if (mimeType.includes('pdf')) return 'document-text';
  if (mimeType.includes('word') || mimeType.includes('doc')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'grid';
  return 'document-outline';
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  onRemove,
  readonly = false,
}) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-3 py-2"
      contentContainerStyle={{ gap: 8 }}
    >
      {attachments.map((att, index) => {
        const isImage = att.type?.startsWith('image/');

        return (
          <View key={`${att.url}-${index}`} className="relative">
            {isImage ? (
              /* Image thumbnail */
              <View className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
                <Image
                  source={{ uri: att.url }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              </View>
            ) : (
              /* File card */
              <View className="w-40 flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3 py-2.5">
                <View className="w-9 h-9 bg-blue-100 rounded-lg items-center justify-center mr-2">
                  <Ionicons name={getFileIcon(att.type) as any} size={18} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-medium text-gray-800" numberOfLines={1}>
                    {att.name}
                  </Text>
                  <Text className="text-[10px] text-gray-400 mt-0.5">
                    {formatFileSize(att.size)}
                  </Text>
                </View>
              </View>
            )}

            {/* Remove button */}
            {!readonly && onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={12} color="white" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};
