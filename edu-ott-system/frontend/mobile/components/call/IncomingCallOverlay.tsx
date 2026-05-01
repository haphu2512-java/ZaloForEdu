import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getSocket } from '../../utils/socketService';

const RING_TIMEOUT = 30;
const VIBRATION_PATTERN = [500, 1000];

interface IncomingCallData {
  roomId: string;
  callerName: string;
  type: 'audio' | 'video';
  fromUserId?: string;
  conversationId?: string;
  isGroup: boolean;
}

export default function IncomingCallOverlay() {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [countdown, setCountdown] = useState(RING_TIMEOUT);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vibrationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersAttached = useRef(false);
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const slideAnim = useRef(new Animated.Value(-300)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const stopRinging = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (vibrationRef.current) { clearInterval(vibrationRef.current); vibrationRef.current = null; }
    Vibration.cancel();
  }, []);

  const dismiss = useCallback(() => {
    stopRinging();
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setIncomingCall(null));
  }, [stopRinging, slideAnim]);

  // Attach socket listeners — retry until socket is ready
  useEffect(() => {
    const handleIncomingCall = (data: any) => {
      setIncomingCall({ ...data, isGroup: false });
      setCountdown(RING_TIMEOUT);
    };
    const handleIncomingGroupCall = (data: any) => {
      setIncomingCall({ ...data, isGroup: true });
      setCountdown(RING_TIMEOUT);
    };
    const handleCallTimeout = ({ roomId }: { roomId: string }) => {
      setIncomingCall((prev) => (prev?.roomId === roomId ? null : prev));
      stopRinging();
    };
    const handleCallEnded = ({ roomId }: { roomId: string }) => {
      setIncomingCall((prev) => (prev?.roomId === roomId ? null : prev));
      stopRinging();
    };

    const attach = () => {
      const socket = getSocket();
      if (!socket) return false;

      // Detach first to avoid double-listening
      socket.off('incoming_call', handleIncomingCall);
      socket.off('incoming_group_call', handleIncomingGroupCall);
      socket.off('call:timeout', handleCallTimeout);
      socket.off('call:ended', handleCallEnded);

      socket.on('incoming_call', handleIncomingCall);
      socket.on('incoming_group_call', handleIncomingGroupCall);
      socket.on('call:timeout', handleCallTimeout);
      socket.on('call:ended', handleCallEnded);

      listenersAttached.current = true;
      return true;
    };

    // Try immediately
    if (!attach()) {
      // Socket not ready — poll every 500ms until connected
      retryRef.current = setInterval(() => {
        if (attach()) {
          clearInterval(retryRef.current!);
          retryRef.current = null;
        }
      }, 500);
    }

    return () => {
      if (retryRef.current) { clearInterval(retryRef.current); }
      const socket = getSocket();
      if (socket) {
        socket.off('incoming_call', handleIncomingCall);
        socket.off('incoming_group_call', handleIncomingGroupCall);
        socket.off('call:timeout', handleCallTimeout);
        socket.off('call:ended', handleCallEnded);
      }
    };
  }, [stopRinging]);

  // Slide in + vibrate when call arrives
  useEffect(() => {
    if (!incomingCall) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 9,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    vibrationRef.current = setInterval(() => Vibration.vibrate(VIBRATION_PATTERN), 2000);
    Vibration.vibrate(VIBRATION_PATTERN);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { dismiss(); return RING_TIMEOUT; }
        return prev - 1;
      });
    }, 1000);

    return () => {
      stopRinging();
      pulseLoop.stop();
    };
  }, [incomingCall?.roomId]);

  const handleAccept = () => {
    if (!incomingCall) return;
    stopRinging();
    const socket = getSocket();

    if (incomingCall.isGroup) {
      socket?.emit('call:accept', {
        roomId: incomingCall.roomId,
        callerId: incomingCall.fromUserId,
      });
      router.push({
        pathname: '/group-call/[roomId]',
        params: { roomId: incomingCall.roomId, type: incomingCall.type },
      } as any);
    } else {
      socket?.emit('call:accept', {
        roomId: incomingCall.roomId,
        callerId: incomingCall.fromUserId,
      });
      router.push({
        pathname: '/call/[roomId]',
        params: { roomId: incomingCall.roomId, type: incomingCall.type },
      } as any);
    }
    setIncomingCall(null);
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    const socket = getSocket();
    if (incomingCall.isGroup) {
      socket?.emit('group_call_decline', {
        conversationId: incomingCall.conversationId,
        roomId: incomingCall.roomId,
      });
    } else {
      socket?.emit('decline_call', {
        callerId: incomingCall.fromUserId,
        roomId: incomingCall.roomId,
      });
    }
    dismiss();
  };

  if (!incomingCall) return null;

  const isVideoCall = incomingCall.type === 'video';

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.card}>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${(countdown / RING_TIMEOUT) * 100}%` }]} />
        </View>
        <View style={styles.cardBody}>
          <View style={styles.callerInfo}>
            <View style={[styles.avatarCircle, { backgroundColor: incomingCall.isGroup ? '#6366f1' : '#0084ff' }]}>
              <Ionicons name={incomingCall.isGroup ? 'people' : 'person'} size={28} color="#fff" />
            </View>
            <View style={styles.callerTextWrap}>
              <Text style={styles.callerName} numberOfLines={1}>
                {incomingCall.callerName || 'Cuộc gọi đến'}
              </Text>
              <Text style={styles.callTypeLabel}>
                {incomingCall.isGroup ? 'Cuộc gọi nhóm' : 'Cuộc gọi'} •{' '}
                {isVideoCall ? 'Video' : 'Thoại'} • {countdown}s
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} activeOpacity={0.7}>
              <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: isVideoCall ? '#0084ff' : '#22c55e' }]}
                onPress={handleAccept}
                activeOpacity={0.7}
              >
                <Ionicons name={isVideoCall ? 'videocam' : 'call'} size={22} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingTop: 50,
  },
  card: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  progressBarBg: { height: 3, backgroundColor: '#374151' },
  progressBarFill: { height: 3, backgroundColor: '#0084ff', borderRadius: 2 },
  cardBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  callerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  callerTextWrap: { marginLeft: 12, flex: 1 },
  callerName: { color: '#F9FAFB', fontSize: 16, fontWeight: '700' },
  callTypeLabel: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  declineBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  acceptBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
