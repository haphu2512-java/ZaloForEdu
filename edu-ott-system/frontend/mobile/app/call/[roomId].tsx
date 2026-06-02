import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Platform,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../../utils/api';
import { getSocket } from '../../utils/socketService';

type CallStatus = 'requesting_permission' | 'connecting' | 'connected' | 'ended' | 'failed';

async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const { PermissionsAndroid } = require('react-native');
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      const camera = grants[PermissionsAndroid.PERMISSIONS.CAMERA];
      const audio = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      return (
        camera === PermissionsAndroid.RESULTS.GRANTED &&
        audio === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch {
      return false;
    }
  }
  return true;
}

export default function CallScreen() {
  const { roomId, type: callType } = useLocalSearchParams<{
    roomId: string;
    type?: string;
  }>();
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>('requesting_permission');
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isVideo = callType !== 'voice';

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      appStateRef.current = next;
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let mounted = true;

    const initCall = async () => {
      // Step 1: Request Camera/Mic permissions
      const hasPermission = await requestMediaPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Cần quyền truy cập',
          'Vui lòng cấp quyền Camera và Microphone để thực hiện cuộc gọi.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (!mounted) return;
      setCallStatus('connecting');

      // Step 2: Fetch token from backend
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

        if (!data.appID || !data.serverSecret) {
          throw new Error('Server chưa cấu hình ZEGO_APP_ID hoặc ZEGO_SERVER_SECRET');
        }

        if (!mounted) return;

        setHtmlContent(buildZegoCallHtml({
          appID: data.appID,
          serverSecret: data.serverSecret,
          roomId: roomId!,
          userID: data.userID,
          userName: data.userName || 'User',
          isVideo,
        }));
        setCallStatus('connected');
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setCallStatus('failed');
        }
      }
    };

    initCall();
    return () => { mounted = false; };
  }, [roomId]);

  const handleEndCall = () => {
    setCallStatus('ended');
    try {
      getSocket()?.emit('call:end', { roomId, reason: 'normal' });
    } catch (_) {}
    setTimeout(() => router.back(), 300);
  };

  const onWebViewMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'leave_room' || msg.type === 'call_ended') {
        handleEndCall();
      }
      if (msg.type === 'error') {
        console.warn('[CallScreen WebView]', msg.message);
      }
    } catch (_) {}
  };

  if (callStatus === 'failed') {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
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
        {(callStatus === 'requesting_permission' || callStatus === 'connecting') && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#0084ff" />
            <Text style={styles.statusText}>
              {callStatus === 'requesting_permission' ? 'Đang xin quyền...' : 'Đang kết nối...'}
            </Text>
          </View>
        )}

        {/* CRITICAL: baseUrl="https://localhost" makes WebRTC think it's a Secure Context */}
        {htmlContent && (
          <WebView
            ref={webviewRef}
            source={{ html: htmlContent, baseUrl: 'https://localhost' }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            mediaCapturePermissionGrantType="grant"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            originWhitelist={['*']}
            mixedContentMode="always"
            onMessage={onWebViewMessage}
            onError={(e) => {
              console.warn('[CallScreen] WebView error:', e.nativeEvent.description);
              setError(e.nativeEvent.description);
              setCallStatus('failed');
            }}
          />
        )}
      </View>
    </>
  );
}

function buildZegoCallHtml(opts: {
  appID: number;
  serverSecret: string;
  roomId: string;
  userID: string;
  userName: string;
  isVideo: boolean;
}) {
  const appID = Number(opts.appID);
  const serverSecret = String(opts.serverSecret).replace(/"/g, '');
  const roomId = String(opts.roomId).replace(/"/g, '');
  const userID = String(opts.userID).replace(/"/g, '');
  const userName = String(opts.userName).replace(/"/g, '');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #root { width: 100%; height: 100%; background: #111827; overflow: hidden; }
    #loading { position:fixed; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#111827; color:#9CA3AF; font-family:sans-serif; font-size:16px; gap:16px; }
    .spinner { width:40px; height:40px; border:3px solid #374151; border-top-color:#0084ff; border-radius:50%; animation:spin 0.8s linear infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <span>Đang kết nối...</span>
  </div>
  <div id="root" style="display:none;width:100%;height:100%"></div>
  <script src="https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js"></script>
  <script>
    (function() {
      var appID = ${appID};
      var serverSecret = "${serverSecret}";
      var roomID = "${roomId}";
      var userID = "${userID}";
      var userName = "${userName}";
      var isVideo = ${opts.isVideo};

      function postMsg(obj) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(obj));
        }
      }

      function waitForSDK(attempts) {
        if (attempts <= 0) {
          postMsg({ type: 'error', message: 'Zego SDK failed to load' });
          return;
        }
        if (typeof ZegoUIKitPrebuilt === 'undefined') {
          setTimeout(function() { waitForSDK(attempts - 1); }, 500);
          return;
        }

        try {
          var kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            appID, serverSecret, roomID, userID, userName
          );
          var zp = ZegoUIKitPrebuilt.create(kitToken);

          document.getElementById('loading').style.display = 'none';
          document.getElementById('root').style.display = 'block';

          zp.joinRoom({
            container: document.getElementById('root'),
            scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
            showPreJoinView: false,
            turnOnMicrophoneWhenJoining: true,
            turnOnCameraWhenJoining: isVideo,
            showMyCameraToggleButton: isVideo,
            showAudioVideoSettingsButton: true,
            showScreenSharingButton: false,
            useFrontFacingCamera: true,
            onLeaveRoom: function() {
              postMsg({ type: 'leave_room' });
            },
          });
        } catch(e) {
          postMsg({ type: 'error', message: e.message });
        }
      }

      window.addEventListener('load', function() {
        waitForSDK(20);
      });
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  centerContainer: {
    flex: 1, backgroundColor: '#111827',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111827', zIndex: 10,
  },
  statusText: { color: '#9CA3AF', fontSize: 16, marginTop: 12 },
  webview: { flex: 1, backgroundColor: '#111827' },
  errorText: { color: '#ef4444', fontSize: 16, marginTop: 16, textAlign: 'center' },
  backBtn: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#0084ff', borderRadius: 10 },
  backBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
