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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      // Thành công -> context tự auto đá sang /(tabs)
    } catch (err: any) {
      if (err.errorCode === 'EMAIL_NOT_VERIFIED') {
        setErrorMsg('');
        router.push({
          pathname: '/(auth)/verify-email' as any,
          params: { email: err.email || email.trim() }
        });
      } else {
        setErrorMsg(err.message || 'Đăng nhập thất bại');
      }
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
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 48 }}>
            {/* Header Section */}
            <View style={{ alignItems: 'center', marginBottom: 48 }}>
              <View style={{
                width: 96, height: 96, backgroundColor: '#2563EB', borderRadius: 28,
                alignItems: 'center', justifyContent: 'center', marginBottom: 24,
                shadowColor: '#93C5FD', shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
              }}>
                <Ionicons name="school" size={48} color="white" />
              </View>
              <Text style={{ fontSize: 36, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 }}>
                Zalo <Text style={{ color: '#2563EB' }}>Edu</Text>
              </Text>
              <Text style={{ color: '#64748B', marginTop: 8, textAlign: 'center', fontSize: 17, fontWeight: '500' }}>
                Education for Everyone
              </Text>
            </View>

            {/* Form Section */}
            <View>
              {errorMsg ? (
                <View style={{
                  backgroundColor: '#FEF2F2', padding: 14, borderRadius: 14,
                  borderWidth: 1, borderColor: '#FECACA', marginBottom: 12,
                }}>
                  <Text style={{ color: '#EF4444', textAlign: 'center', fontWeight: '600' }}>{errorMsg}</Text>
                </View>
              ) : null}

              <Text style={{ color: '#1E293B', fontWeight: '600', marginLeft: 4, marginBottom: 6 }}>Email Address</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
                borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
                paddingVertical: 16, marginBottom: 16,
                shadowColor: '#E2E8F0', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
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

              <Text style={{ color: '#1E293B', fontWeight: '600', marginLeft: 4, marginBottom: 6 }}>Password</Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
                borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16,
                paddingVertical: 16,
                shadowColor: '#E2E8F0', shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3, shadowRadius: 4, elevation: 2,
              }}>
                <Ionicons name="lock-closed-outline" size={22} color="#64748B" />
                <TextInput
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#94A3B8"
                  style={{ flex: 1, marginLeft: 12, color: '#0F172A', fontSize: 16 }}
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', paddingVertical: 12 }}
                onPress={() => router.push('/(auth)/forgot-password' as any)}
              >
                <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 14 }}>Quên mật khẩu?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={isSubmitting}
                style={{
                  backgroundColor: isSubmitting ? '#93C5FD' : '#2563EB',
                  borderRadius: 16, paddingVertical: 18, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', marginTop: 8,
                  shadowColor: isSubmitting ? '#93C5FD' : '#2563EB',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
                }}
              >
                {isSubmitting ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 36 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
              <Text style={{ marginHorizontal: 16, color: '#94A3B8', fontWeight: '500' }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E2E8F0' }} />
            </View>

            {/* Social Login */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
              <TouchableOpacity style={{
                width: 56, height: 56, borderWidth: 1, borderColor: '#E2E8F0',
                borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="logo-google" size={24} color="#EA4335" />
              </TouchableOpacity>
              <TouchableOpacity style={{
                width: 56, height: 56, borderWidth: 1, borderColor: '#E2E8F0',
                borderRadius: 16, alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="logo-apple" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {/* Footer Section */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 'auto', paddingTop: 40 }}>
              <Text style={{ color: '#64748B', fontSize: 15 }}>Chưa có tài khoản? </Text>
              <Link href={'/(auth)/register' as any} asChild>
                <TouchableOpacity>
                  <Text style={{ color: '#2563EB', fontWeight: '800', fontSize: 15 }}>Đăng ký</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
