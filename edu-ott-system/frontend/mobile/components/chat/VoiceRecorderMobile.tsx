import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync } from 'expo-audio';
import type { AudioRecorder } from 'expo-audio';

interface VoiceRecorderMobileProps {
  onCancel: () => void;
  onSend: (uri: string, duration: number) => void; // Add duration parameter
}

export const VoiceRecorderMobile: React.FC<VoiceRecorderMobileProps> = ({ onCancel, onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visualizerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // dùng ref để cleanup luôn trỏ đúng instance, tránh stale closure
  const recordingRef = useRef<AudioRecorder | null>(null);

  // Anim cho các cột visualizer
  const animValues = useRef(new Array(20).fill(0).map(() => new Animated.Value(4))).current;

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (visualizerRef.current) clearInterval(visualizerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stop().catch(() => null);
      }
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setDuration(prev => prev + 100);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        onCancel();
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });

      const newRecording = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await newRecording.prepareToRecordAsync();
      newRecording.record();
      recordingRef.current = newRecording;
      setIsRecording(true);
      startTimer();

      // Giả lập visualizer nếu không có metering real-time
      visualizerRef.current = setInterval(() => {
        animValues.forEach((val) => {
          Animated.spring(val, {
            toValue: 4 + Math.random() * 20,
            useNativeDriver: false,
          }).start();
        });
      }, 150);

    } catch (err) {
      console.error('Failed to start recording', err);
      onCancel();
    }
  };

  const handleStopAndSend = async () => {
    if (!recordingRef.current) return;
    try {
      stopTimer();
      if (visualizerRef.current) clearInterval(visualizerRef.current);
      
      // Capture final duration in seconds before stopping
      const finalDurationSeconds = Math.floor(duration / 1000);
      
      await recordingRef.current.stop();
      const uri = recordingRef.current.uri;
      recordingRef.current = null;
      if (uri) {
        onSend(uri, finalDurationSeconds); // Pass duration in seconds
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const handleCancel = async () => {
    stopTimer();
    if (visualizerRef.current) clearInterval(visualizerRef.current);
    if (recordingRef.current) {
      await recordingRef.current.stop().catch(() => null);
      recordingRef.current = null;
    }
    onCancel();
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
        <Ionicons name="trash-outline" size={24} color="#EF4444" />
      </TouchableOpacity>

      <View style={styles.recorderBody}>
        <View style={styles.visualizer}>
          {animValues.map((val, i) => (
            <Animated.View 
              key={i} 
              style={[
                styles.bar, 
                { height: val, backgroundColor: '#0068FF' }
              ]} 
            />
          ))}
        </View>
        <Text style={styles.timerText}>{formatTime(duration)}</Text>
      </View>

      <TouchableOpacity onPress={handleStopAndSend} style={styles.sendBtn}>
        <Ionicons name="send" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recorderBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 30,
    width: 100,
    justifyContent: 'center',
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0068FF',
    fontFamily: 'monospace',
    minWidth: 45,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0068FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
