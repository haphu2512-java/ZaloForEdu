import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    const ident = identifier.trim();
    const isEmail = ident.includes('@');
    const isPhone = /^\+?\d{8,15}$/.test(ident);

    if (!ident || !password || !confirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ email/SĐT và mật khẩu');
      return;
    }
    if (!isEmail && !isPhone) {
      setErrorMsg('Vui lòng nhập email hợp lệ hoặc số điện thoại hợp lệ');
      return;
    }
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ident)) {
      setErrorMsg('Email không hợp lệ');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await register({
        email: isEmail ? ident.toLowerCase() : undefined,
        phone: !isEmail ? ident : undefined,
        password,
      });
      if (isEmail) {
        router.replace({
          pathname: '/(auth)/verify-email' as any,
          params: { email: ident.toLowerCase() },
        });
      } else {
        router.replace('/(auth)/login' as any);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldStyle = (fieldName: string) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: focusedField === fieldName ? '#6366F1' : '#E2E8F0',
    backgroundColor: focusedField === fieldName ? '#fff' : '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <View style={{ marginTop: 48, marginBottom: 36 }}>
            <Text style={{ fontSize: 34, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>Tạo tài khoản</Text>
            <Text style={{ color: '#64748B', marginTop: 8, fontSize: 16, lineHeight: 24 }}>
              Kết nối và nhắn tin cùng bạn bè
            </Text>
          </View>

          <View>
            {errorMsg ? (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  padding: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#FECACA',
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>{errorMsg}</Text>
              </View>
            ) : null}

            <View style={getFieldStyle('identifier')}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={focusedField === 'identifier' ? '#6366F1' : '#94A3B8'}
              />
              <TextInput
                placeholder="Email hoặc Số điện thoại *"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('identifier')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={getFieldStyle('password')}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={focusedField === 'password' ? '#6366F1' : '#94A3B8'}
              />
              <TextInput
                placeholder="Mật khẩu (ít nhất 6 ký tự) *"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <View style={getFieldStyle('confirmPassword')}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={focusedField === 'confirmPassword' ? '#6366F1' : '#94A3B8'}
              />
              <TextInput
                placeholder="Xác nhận mật khẩu *"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#0F172A' }}
                placeholderTextColor="#94A3B8"
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
            
            <View style={{ marginBottom: 8, marginTop: -8, height: 20 }}>
              {password.length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map((level) => (
                      <View
                        key={level}
                        style={{
                          flex: 1, height: 3, borderRadius: 2,
                          backgroundColor: password.length >= level * 3
                            ? level <= 1 ? '#EF4444' : level <= 2 ? '#F59E0B' : level <= 3 ? '#3B82F6' : '#10B981'
                            : '#E2E8F0',
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                    {password.length < 6 ? 'Quá ngắn' : password.length < 8 ? 'Trung bình' : password.length < 12 ? 'Mạnh' : 'Rất mạnh'}
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={isSubmitting}
              style={{
                backgroundColor: isSubmitting ? '#A5B4FC' : '#6366F1',
                borderRadius: 16,
                paddingVertical: 18,
                marginTop: 16,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.35,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
              <Text style={{ color: '#fff', textAlign: 'center', fontSize: 17, fontWeight: '700' }}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 32 }}>
            <Text style={{ color: '#64748B', fontSize: 15 }}>Đã có tài khoản? </Text>
            <Link href={'/(auth)/login' as any} asChild>
              <TouchableOpacity>
                <Text style={{ color: '#6366F1', fontSize: 15, fontWeight: '800' }}>Đăng nhập</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
