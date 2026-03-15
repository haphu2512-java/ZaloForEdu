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
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [role] = useState<'student' | 'teacher' | 'admin'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password, role });
      Alert.alert(
        'Đăng ký thành công', 
        'Vui lòng kiểm tra Email hoặc liên hệ Admin để xác thực tài khoản trước khi đăng nhập nhé!',
        [{ text: 'Về Đăng Nhập', onPress: () => router.replace('/(auth)/login' as any) }]
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng ký thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const InputField = ({
    icon,
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    keyboardType,
    fieldName,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    fieldName: string;
  }) => (
    <View
      className={`flex-row items-center border rounded-2xl px-4 py-3.5 mb-4 bg-gray-50 ${
        focusedField === fieldName 
          ? 'border-indigo-500 bg-white ring-4 ring-indigo-100 shadow-sm' 
          : 'border-gray-200'
      }`}
    >
      <Ionicons
        name={icon}
        size={20}
        color={focusedField === fieldName ? '#6366f1' : '#9ca3af'}
        className="mr-3"
      />
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !showPassword}
        keyboardType={keyboardType}
        className="flex-1 text-base text-gray-800"
        placeholderTextColor="#9ca3af"
        onFocus={() => setFocusedField(fieldName)}
        onBlur={() => setFocusedField(null)}
        autoCapitalize="none"
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 }}
        >
          <View className="mt-12 mb-10">
            <Text className="text-4xl font-bold text-gray-900 tracking-tight">
              Create an Account
            </Text>
            <Text className="text-gray-500 mt-2 text-lg">
              Start your educational journey with us.
            </Text>
          </View>

          <View>
            {errorMsg ? (
              <View className="bg-red-50 p-3 rounded-xl border border-red-200 mb-4">
                <Text className="text-red-500 text-center font-medium">{errorMsg}</Text>
              </View>
            ) : null}
            <InputField
              icon="person-outline"
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
              fieldName="fullName"
            />

            <InputField
              icon="mail-outline"
              placeholder="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              fieldName="email"
            />

            <InputField
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              fieldName="password"
            />

            <InputField
              icon="shield-checkmark-outline"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              fieldName="confirmPassword"
            />

            <TouchableOpacity
              onPress={handleRegister}
              activeOpacity={0.8}
              disabled={isSubmitting}
              className={`rounded-2xl py-4 mt-6 shadow-xl flex-row justify-center items-center ${isSubmitting ? 'bg-indigo-400 shadow-indigo-100' : 'bg-indigo-600 shadow-indigo-200'}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" className="mr-2" />
              ) : null}
              <Text className="text-white text-center text-lg font-bold">Register</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-auto pt-10">
            <Text className="text-gray-600 text-base">Already have an account? </Text>
            <Link href={"/(auth)/login" as any} asChild>
              <TouchableOpacity>
                <Text className="text-indigo-600 text-base font-bold">Log in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
