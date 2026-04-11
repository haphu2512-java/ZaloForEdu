import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { forgotPassword } from '../../utils/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!identifier) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc số điện thoại');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const isEmail = identifier.includes('@');
      await forgotPassword(isEmail ? { email: identifier.trim() } : { phone: identifier.trim() });
      Alert.alert(
        'Thành công',
        'Nếu tài khoản tồn tại, hệ thống đã gửi mã đến email hoặc số điện thoại của bạn.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/reset-password') }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          {/* Header */}
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24, marginTop: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>Quên mật khẩu</Text>
          <Text style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>
            Nhập email hoặc số điện thoại của bạn để nhận mã khôi phục.
          </Text>

          {/* Form */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
            borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 24
          }}>
            <Ionicons name="mail-outline" size={22} color="#64748B" />
            <TextInput
              placeholder="Email hoặc số điện thoại"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
              paddingVertical: 18, borderRadius: 16, alignItems: 'center'
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Gửi yêu cầu</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
