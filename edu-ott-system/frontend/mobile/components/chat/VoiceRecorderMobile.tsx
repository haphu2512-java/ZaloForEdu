import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

interface VoiceRecorderMobileProps {
  onCancel: () => void;
  onSend: (uri: string) => void;
}

export const VoiceRecorderMobile: React.FC<VoiceRecorderMobileProps> = ({ onCancel, onSend }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [metering, setMetering] = useState<number[]>(new Array(20).fill(4));

  // Anim cho các cột visualizer
  const animValues = useRef(new Array(20).fill(0).map(() => new Animated.Value(4))).current;

  useEffect(() => {
    startRecording();
    return () => {
      stopTimer();
      if (recording) {
        recording.stopAndUnloadAsync();
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
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      
      setRecording(newRecording);
      setIsRecording(true);
      startTimer();

      // Giả lập visualizer nếu không có metering real-time (Expo AV metering hơi phức tạp)
      const visualizerInterval = setInterval(() => {
        animValues.forEach((val) => {
          Animated.spring(val, {
            toValue: 4 + Math.random() * 20,
            useNativeDriver: false,
          }).start();
        });
      }, 150);

      return () => clearInterval(visualizerInterval);

    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleStopAndSend = async () => {
    if (!recording) return;
    try {
      stopTimer();
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        onSend(uri);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    }
  };

  const handleCancel = async () => {
    if (recording) {
      stopTimer();
      await recording.stopAndUnloadAsync();
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
