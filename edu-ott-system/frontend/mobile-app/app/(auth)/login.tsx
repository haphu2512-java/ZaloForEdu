import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Alert } from 'react-native';
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
      setErrorMsg(err.message || 'Đăng nhập thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          className="px-8"
        >
          <View className="flex-1 justify-center py-12">
            {/* Header Section */}
            <View className="items-center mb-12">
              <View className="w-24 h-24 bg-blue-600 rounded-3xl items-center justify-center shadow-xl shadow-blue-300 mb-6">
                <Ionicons name="school" size={48} color="white" />
              </View>
              <Text className="text-4xl font-extrabold text-slate-900 tracking-tight">
                Zalo <Text className="text-blue-600">Edu</Text>
              </Text>
              <Text className="text-slate-500 mt-2 text-center text-lg font-medium">
                Education for Everyone
              </Text>
            </View>

            {/* Form Section */}
            <View className="space-y-4">
              {errorMsg ? (
                <View className="bg-red-50 p-3 rounded-xl border border-red-200 mb-2">
                  <Text className="text-red-500 text-center font-medium">{errorMsg}</Text>
                </View>
              ) : null}
              <Text className="text-slate-800 font-semibold ml-1 mb-1">Email Address</Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-4 shadow-sm shadow-slate-200">
                <Ionicons name="mail-outline" size={22} color="#64748b" />
                <TextInput
                  placeholder="name@university.edu"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 text-slate-900 text-base"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <Text className="text-slate-800 font-semibold ml-1 mb-1">Password</Text>
              <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 shadow-sm shadow-slate-200">
                <Ionicons name="lock-closed-outline" size={22} color="#64748b" />
                <TextInput
                  placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-3 text-slate-900 text-base"
                  secureTextEntry={!isPasswordVisible}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity className="self-end py-3">
                <Text className="text-blue-600 font-bold text-sm">Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.8}
                disabled={isSubmitting}
                className={`rounded-2xl py-5 items-center shadow-lg mt-4 flex-row justify-center ${isSubmitting ? 'bg-blue-400 shadow-blue-200' : 'bg-blue-600 shadow-blue-400'}`}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="white" className="mr-2" />
                ) : null}
                <Text className="text-white font-bold text-lg">Login</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View className="flex-row items-center my-10">
              <View className="flex-1 h-[1px] bg-slate-200" />
              <Text className="mx-4 text-slate-400 font-medium">OR</Text>
              <View className="flex-1 h-[1px] bg-slate-200" />
            </View>

            {/* Social Login (Optional aesthetic) */}
            <View className="flex-row justify-center space-x-6">
              <TouchableOpacity className="w-14 h-14 border border-slate-200 rounded-2xl items-center justify-center">
                <Ionicons name="logo-google" size={24} color="#ea4335" />
              </TouchableOpacity>
              <TouchableOpacity className="w-14 h-14 border border-slate-200 rounded-2xl items-center justify-center">
                <Ionicons name="logo-apple" size={24} color="black" />
              </TouchableOpacity>
            </View>

            {/* Footer Section */}
            <View className="flex-row justify-center mt-auto pt-10">
              <Text className="text-slate-500 text-base">Don't have an account? </Text>
              <Link href={"/(auth)/register" as any} asChild>
                <TouchableOpacity>
                  <Text className="text-blue-600 font-extrabold text-base">Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
