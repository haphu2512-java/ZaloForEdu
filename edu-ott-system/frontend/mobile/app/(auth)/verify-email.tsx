import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import { resendVerificationEmail, verifyEmail } from '../../utils/authService';
import { useAuth } from '../../context/auth';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { user, refreshUser } = useAuth();
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  if (user?.isEmailVerified) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginTop: 16 }}>Đã xác thực!</Text>
        <Text style={{ color: '#64748B', marginTop: 8 }}>Tài khoản của bạn đã được xác thực.</Text>
        <TouchableOpacity
          onPress={() => router.navigate('/(tabs)')}
          style={{ marginTop: 32, backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Về trang chủ</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSubmit = async () => {
    if (!/^\d{6}$/.test(token.trim())) {
      Alert.alert('Lỗi', 'Vui lòng nhập OTP 6 chữ số');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyEmail(token.trim());
      Alert.alert('Thành công', 'Email đã được xác thực!');
      await refreshUser();
      router.replace('/(auth)/login' as any);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Mã OTP không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    const targetEmail =
      (typeof params.email === 'string' ? params.email : '').trim().toLowerCase()
      || (user?.email || '').trim().toLowerCase();
    if (!targetEmail) {
      Alert.alert('Lỗi', 'Không tìm thấy email để gửi lại OTP');
      return;
    }
    setIsResending(true);
    try {
      await resendVerificationEmail(targetEmail);
      Alert.alert('Thành công', 'Đã gửi lại OTP 6 chữ số về email của bạn');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi lại OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(auth)/login');
              }
            }}
            style={{ marginBottom: 24, marginTop: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={{ fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>Xác thực Email</Text>
          <Text style={{ color: '#64748B', fontSize: 16, marginBottom: 32 }}>
            Nhập OTP 6 chữ số đã được gửi tới email của bạn.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 16,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color="#64748B" />
            <TextInput
              placeholder="Nhập OTP 6 chữ số"
              placeholderTextColor="#94A3B8"
              style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
              keyboardType="number-pad"
              maxLength={6}
              value={token}
              onChangeText={(v) => setToken(v.replace(/\D/g, ''))}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
              paddingVertical: 18,
              borderRadius: 16,
              alignItems: 'center',
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Xác thực ngay</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={isResending || isSubmitting}
            style={{ alignItems: 'center', marginTop: 14, paddingVertical: 10 }}
          >
            {isResending ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={{ color: '#2563EB', fontWeight: '600' }}>Gửi lại OTP</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
