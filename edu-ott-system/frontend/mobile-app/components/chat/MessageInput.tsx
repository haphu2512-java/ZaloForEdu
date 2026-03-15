import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <View className="bg-white border-t border-gray-100 p-3 pb-8">
      <View className="flex-row items-center bg-gray-50 rounded-full px-4 py-2 border border-gray-200">
        <TouchableOpacity className="mr-3">
          <Ionicons name="add" size={24} color="#3b82f6" />
        </TouchableOpacity>
        
        <TextInput
          className="flex-1 text-base py-1 text-gray-900"
          placeholder="Viết tin nhắn..."
          placeholderTextColor="#9ca3af"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        {message.trim().length > 0 ? (
          <TouchableOpacity 
            onPress={handleSend}
            className="ml-3 bg-blue-500 rounded-full p-2"
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center">
            <TouchableOpacity className="ml-3">
              <Ionicons name="camera-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity className="ml-3">
              <Ionicons name="mic-outline" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};
