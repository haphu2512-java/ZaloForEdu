import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { resetPassword } from '../../utils/authService';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!token || !password) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ token và mật khẩu mới');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await resetPassword({ token: token.trim(), newPassword: password });
      Alert.alert(
        'Thành công',
        'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.',
        [{ text: 'Đăng nhập', onPress: () => router.navigate('/(auth)/login') }]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Mã xác nhận không đúng hoặc đã hết hạn');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          {/* Header */}
          <TouchableOpacity onPress={() => router.navigate('/(auth)/login')} style={{ marginBottom: 24, marginTop: 16 }}>
            <Ionicons name="close" size={28} color="#0F172A" />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>Đặt lại mật khẩu</Text>
          <Text style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>
            Nhập mã xác nhận chúng tôi đã gửi cho bạn và mật khẩu mới.
          </Text>

          {/* Token Field */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
            borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 16
          }}>
            <Ionicons name="key-outline" size={22} color="#64748B" />
            <TextInput
              placeholder="Mã xác nhận (Token)"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
              autoCapitalize="none"
              value={token}
              onChangeText={setToken}
            />
          </View>

          {/* New Password Field */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
            borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, marginBottom: 24
          }}>
            <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
            <TextInput
              placeholder="Mật khẩu mới (ít nhất 6 ký tự)"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color="#64748B" />
            </TouchableOpacity>
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
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Đổi mật khẩu</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
