import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as authService from '../../utils/authService';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify = async () => {
    if (!otp.trim()) {
      setErrorMsg('Vui lòng nhập mã xác thực');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      await authService.verifyEmail({
        email: params.email?.trim(),
        otp: otp.trim(),
      });
      Alert.alert(
        'Xác thực thành công! ✅',
        'Email của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.',
        [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Mã xác thực không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!params.email) {
      Alert.alert('Thông báo', 'Không tìm thấy email. Vui lòng quay lại đăng ký.');
      return;
    }
    setIsResending(true);
    try {
      await authService.resendVerification(params.email);
      setSuccessMsg('Đã gửi lại mã xác thực! Kiểm tra hộp thư của bạn.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Gửi lại thất bại');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 28, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="arrow-back" size={24} color="#334155" />
            <Text style={{ marginLeft: 8, color: '#334155', fontSize: 16 }}>Quay lại</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 40 }}>
            {/* Icon */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{
                width: 96, height: 96, backgroundColor: '#EEF2FF', borderRadius: 48,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}>
                <Ionicons name="mail-open" size={48} color="#6366F1" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                Xác thực Email
              </Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
                Chúng tôi đã gửi mã xác thực đến{'\n'}
                <Text style={{ fontWeight: '700', color: '#6366F1' }}>{params.email || 'email của bạn'}</Text>
              </Text>
            </View>

            {/* Messages */}
            {errorMsg ? (
              <View style={{
                backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14,
                borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
              }}>
                <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={{
                backgroundColor: '#F0FDF4', padding: 14, borderRadius: 14,
                borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16,
              }}>
                <Text style={{ color: '#16A34A', textAlign: 'center', fontWeight: '600' }}>{successMsg}</Text>
              </View>
            ) : null}

            {/* Token Input */}
            <Text style={{ color: '#334155', fontWeight: '600', marginLeft: 4, marginBottom: 8, fontSize: 15 }}>
              Mã OTP
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
              borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
              paddingVertical: 16, marginBottom: 24,
            }}>
              <Ionicons name="key-outline" size={22} color="#64748B" />
              <TextInput
                placeholder="Nhập mã OTP 6 số"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerify}
              activeOpacity={0.8}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1',
                borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Xác thực</Text>
            </TouchableOpacity>

            {/* Resend */}
            <View style={{ alignItems: 'center', marginTop: 28 }}>
              <Text style={{ color: '#64748B', fontSize: 14 }}>Chưa nhận được mã?</Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                style={{ marginTop: 8 }}
              >
                {isResending ? (
                  <ActivityIndicator color="#6366F1" size="small" />
                ) : (
                  <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 15 }}>
                    Gửi lại mã xác thực
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 20 }}>
            <Text style={{ color: '#64748B', fontSize: 15 }}>Đã xác thực? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={{ color: '#6366F1', fontWeight: '800', fontSize: 15 }}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
