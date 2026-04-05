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
import { useRouter } from 'expo-router';
import * as authService from '../../utils/authService';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSendReset = async () => {
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập email');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword({ email: email.trim() });
      setSent(true);
      // Dev mode: Backend trả về resetToken cho testing
      if (res.resetToken) {
        setResetToken(res.resetToken);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gửi yêu cầu thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToReset = () => {
    router.push({
      pathname: '/(auth)/reset-password' as any,
      params: { email, resetToken },
    });
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
                width: 96, height: 96, backgroundColor: '#FEF3C7', borderRadius: 48,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}>
                <Ionicons name="lock-open" size={48} color="#F59E0B" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                Quên mật khẩu?
              </Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
                Nhập email đã đăng ký để nhận hướng dẫn{'\n'}đặt lại mật khẩu
              </Text>
            </View>

            {!sent ? (
              <>
                {/* Error */}
                {errorMsg ? (
                  <View style={{
                    backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14,
                    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
                  }}>
                    <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>{errorMsg}</Text>
                  </View>
                ) : null}

                {/* Email Input */}
                <Text style={{ color: '#334155', fontWeight: '600', marginLeft: 4, marginBottom: 8, fontSize: 15 }}>
                  Email Address
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
                  borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
                  paddingVertical: 16, marginBottom: 24,
                }}>
                  <Ionicons name="mail-outline" size={22} color="#64748B" />
                  <TextInput
                    placeholder="name@university.edu"
                    placeholderTextColor="#94A3B8"
                    style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Send Button */}
                <TouchableOpacity
                  onPress={handleSendReset}
                  activeOpacity={0.8}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting ? '#FCD34D' : '#F59E0B',
                    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center',
                    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
                  }}
                >
                  {isSubmitting ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Gửi yêu cầu</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Success State */}
                <View style={{
                  backgroundColor: '#F0FDF4', padding: 20, borderRadius: 16,
                  borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 24, alignItems: 'center',
                }}>
                  <Ionicons name="checkmark-circle" size={48} color="#16A34A" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#166534', fontWeight: '700', fontSize: 17, textAlign: 'center', marginBottom: 8 }}>
                    Đã gửi email!
                  </Text>
                  <Text style={{ color: '#15803D', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
                    Kiểm tra hộp thư <Text style={{ fontWeight: '700' }}>{email}</Text> để lấy mã đặt lại mật khẩu
                  </Text>
                </View>

                {/* Dev: Show resetToken nếu có */}
                {resetToken ? (
                  <View style={{
                    backgroundColor: '#EFF6FF', padding: 14, borderRadius: 14,
                    borderWidth: 1, borderColor: '#BFDBFE', marginBottom: 16,
                  }}>
                    <Text style={{ color: '#1D4ED8', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                      🔧 Dev Mode — Reset Token:
                    </Text>
                    <Text style={{ color: '#1E40AF', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} numberOfLines={2}>
                      {resetToken}
                    </Text>
                  </View>
                ) : null}

                {/* Navigate to Reset */}
                <TouchableOpacity
                  onPress={handleGoToReset}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: '#6366F1',
                    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center',
                    shadowColor: '#6366F1', shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
                  }}
                >
                  <Ionicons name="key-outline" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Đặt lại mật khẩu</Text>
                </TouchableOpacity>

                {/* Resend */}
                <TouchableOpacity
                  onPress={() => { setSent(false); setResetToken(''); }}
                  style={{ alignItems: 'center', marginTop: 20 }}
                >
                  <Text style={{ color: '#F59E0B', fontWeight: '700', fontSize: 15 }}>Gửi lại email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: 20 }}>
            <Text style={{ color: '#64748B', fontSize: 15 }}>Nhớ mật khẩu? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login' as any)}>
              <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 15 }}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
