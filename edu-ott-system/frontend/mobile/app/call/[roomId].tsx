import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../utils/api';

type CallStatus = 'connecting' | 'ringing' | 'connected' | 'ended' | 'failed';

export default function CallScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenDataRef = useRef<any>(null);

  // Fetch call token from backend
  useEffect(() => {
    let mounted = true;

    const initCall = async () => {
      try {
        const authToken = await AsyncStorage.getItem('authToken');
        if (!authToken) {
          setError('Chưa đăng nhập');
          setCallStatus('failed');
          return;
        }

        const res = await fetch(`${API_BASE_URL}/calls/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ roomId }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `Token error (${res.status})`);
        }

        const { data } = await res.json();
        if (mounted) {
          tokenDataRef.current = data;
          setCallStatus('connected');

          // Start duration timer
          timerRef.current = setInterval(() => {
            setDuration((prev) => prev + 1);
          }, 1000);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setCallStatus('failed');
        }
      }
    };

    initCall();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [roomId]);

  const handleEndCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCallStatus('ended');
    // Emit call:end via socket
    try {
      const { getSocket } = require('../../utils/socketService');
      const socket = getSocket();
      socket?.emit('call:end', { roomId, reason: 'normal' });
    } catch (_) {}
    setTimeout(() => router.back(), 500);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callStatus === 'failed') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.container}>
          <Ionicons name="warning" size={48} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Không thể kết nối cuộc gọi'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Status */}
        <View style={styles.statusArea}>
          {callStatus === 'connecting' ? (
            <>
              <ActivityIndicator size="large" color="#0084ff" />
              <Text style={styles.statusText}>Đang kết nối...</Text>
            </>
          ) : (
            <>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={48} color="#fff" />
              </View>
              <Text style={styles.statusText}>
                {callStatus === 'connected' ? 'Đang gọi' : 'Đã kết thúc'}
              </Text>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            </>
          )}
        </View>

        {/* Controls */}
        {callStatus === 'connected' && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color="#fff" />
              <Text style={styles.controlLabel}>{isMuted ? 'Bỏ tắt' : 'Tắt mic'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
              <Ionicons name="call" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
              onPress={() => setIsSpeaker(!isSpeaker)}
            >
              <Ionicons name={isSpeaker ? 'volume-high' : 'volume-medium'} size={24} color="#fff" />
              <Text style={styles.controlLabel}>{isSpeaker ? 'Loa ngoài' : 'Loa trong'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusArea: {
    alignItems: 'center',
    marginBottom: 60,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    color: '#9CA3AF',
    fontSize: 16,
    marginTop: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    position: 'absolute',
    bottom: 80,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 16,
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  controlLabel: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0084ff',
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
