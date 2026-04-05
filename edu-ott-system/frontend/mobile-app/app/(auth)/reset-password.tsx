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

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; resetToken?: string }>();

  const [token, setToken] = useState(params.resetToken || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!token.trim()) {
      setErrorMsg('Vui lòng nhập mã reset');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await authService.resetPassword(token.trim(), { password: newPassword });
      Alert.alert(
        'Đặt lại thành công! 🎉',
        'Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập bằng mật khẩu mới.',
        [{ text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Đặt lại mật khẩu thất bại. Mã reset có thể đã hết hạn.');
    } finally {
      setIsSubmitting(false);
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
                width: 96, height: 96, backgroundColor: '#ECFDF5', borderRadius: 48,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              }}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' }}>
                Đặt lại mật khẩu
              </Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
                Nhập mã reset và mật khẩu mới của bạn
              </Text>
            </View>

            {/* Error */}
            {errorMsg ? (
              <View style={{
                backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14,
                borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
              }}>
                <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Token Input */}
            <Text style={{ color: '#334155', fontWeight: '600', marginLeft: 4, marginBottom: 8, fontSize: 15 }}>
              Mã Reset Token
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
              borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
              paddingVertical: 16, marginBottom: 20,
            }}>
              <Ionicons name="key-outline" size={22} color="#64748B" />
              <TextInput
                placeholder="Dán mã reset tại đây"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                autoCapitalize="none"
                autoCorrect={false}
                value={token}
                onChangeText={setToken}
              />
            </View>

            {/* New Password */}
            <Text style={{ color: '#334155', fontWeight: '600', marginLeft: 4, marginBottom: 8, fontSize: 15 }}>
              Mật khẩu mới
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
              borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
              paddingVertical: 16, marginBottom: 20,
            }}>
              <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
              <TextInput
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <Text style={{ color: '#334155', fontWeight: '600', marginLeft: 4, marginBottom: 8, fontSize: 15 }}>
              Xác nhận mật khẩu
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
              borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
              paddingVertical: 16, marginBottom: 28,
            }}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#64748B" />
              <TextInput
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor="#94A3B8"
                style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            {/* Password Strength Indicator */}
            {newPassword.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 8 }}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={{
                        flex: 1, height: 4, borderRadius: 2,
                        backgroundColor: newPassword.length >= level * 3
                          ? level <= 1 ? '#EF4444' : level <= 2 ? '#F59E0B' : level <= 3 ? '#3B82F6' : '#10B981'
                          : '#E2E8F0',
                      }}
                    />
                  ))}
                </View>
                <Text style={{ color: '#64748B', fontSize: 12 }}>
                  {newPassword.length < 6 ? '⚠️ Quá ngắn' :
                   newPassword.length < 8 ? '🔸 Trung bình' :
                   newPassword.length < 12 ? '🔹 Mạnh' : '✅ Rất mạnh'}
                </Text>
              </View>
            )}

            {/* Reset Button */}
            <TouchableOpacity
              onPress={handleReset}
              activeOpacity={0.8}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#6EE7B7' : '#10B981',
                borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center',
                shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Đặt lại mật khẩu</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
